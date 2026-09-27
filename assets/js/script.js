
const channels = [
  { id: 'jonvlogs', name: 'JonVlogs' },
  { id: 'sheviii2k', name: 'Sheviii2k' },
  { id: 'otaviocampos', name: 'Otávio Campos' },
  { id: 'linsjr', name: 'Lins Jr' },
];

const slots = ['main', 'side1', 'side2', 'side3'];
const assignment = {};
const muted = {};
channels.forEach((ch, i) => {
  assignment[ch.id] = slots[i];
  muted[ch.id] = slots[i] !== 'main'; // só a live em destaque começa com som
});

const grid = document.getElementById('grid');

const layoutSelect = document.getElementById('layoutSelect');
grid.dataset.layout = layoutSelect.value; // 'padrao' por padrão
layoutSelect.addEventListener('change', () => {
  grid.dataset.layout = layoutSelect.value;
});

const elements = {}; // chId -> { item, iframe, muteBtn, focusBtn, playerWrap }
let dragChannel = null;

function channelName(id) { return (channels.find(c => c.id === id) || {}).name || id; }
function currentMainId() { return Object.keys(assignment).find(id => assignment[id] === 'main'); }

function playerSrc(id, bust) {
  const m = muted[id] ? 'true' : 'false';
  return `https://player.kick.com/${id}?muted=${m}${bust ? `&_r=${Date.now()}` : ''}`;
}

function swap(idA, idB) {
  if (!idA || !idB || idA === idB) return;
  const prevMain = currentMainId();
  const a = assignment[idA], b = assignment[idB];
  assignment[idA] = b;
  assignment[idB] = a;
  const newMain = currentMainId();
  if (prevMain !== newMain) {
    // a live em destaque muda: ela ganha o som, a que sai perde
    if (newMain && muted[newMain]) setMuted(newMain, false);
    if (prevMain && prevMain !== newMain) setMuted(prevMain, true);
  }
  positionAll();
  updateChatPanel();
}

function setMuted(id, value) {
  muted[id] = value;
  const el = elements[id];
  if (!el) return;
  el.iframe.src = playerSrc(id, false);
  el.muteBtn.textContent = value ? '🔇' : '🔊';
  el.muteBtn.classList.toggle('active', !value);
  el.muteBtn.setAttribute('aria-label', value ? `Ativar som de ${channelName(id)}` : `Silenciar ${channelName(id)}`);
}

function clearDragVisuals() {
  grid.querySelectorAll('.stream-item').forEach(it => it.classList.remove('dragging', 'drop-target'));
}

function openChatPopup(id) {
  window.open(`https://kick.com/popout/${id}/chat`, `kickchat_${id}`, 'width=380,height=720,noopener');
}

function updateChatPanel() {
  const mainId = currentMainId();
  chatTitle.textContent = `Chat — ${channelName(mainId)}`;
  const nextSrc = `https://kick.com/popout/${mainId}/chat`;
  if (chatFrame.src !== nextSrc) chatFrame.src = nextSrc;
}

function buildStreamItem(ch) {
  const item = document.createElement('div');
  item.className = 'stream-item';
  item.dataset.channel = ch.id;

  const bar = document.createElement('div');
  bar.className = 'stream-bar';

  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.innerHTML = `
      <span class="grip"><span></span><span></span><span></span><span></span><span></span><span></span></span>
      <span class="live-dot"></span>
      <span class="stream-name">${ch.name}</span>
    `;

  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-1.5 flex-wrap';

  const focusBtn = document.createElement('button');
  focusBtn.className = 'icon-btn';
  focusBtn.textContent = 'Destacar';
  focusBtn.addEventListener('click', () => swap(ch.id, currentMainId()));
  actions.appendChild(focusBtn);

  const muteBtn = document.createElement('button');
  muteBtn.className = 'icon-btn';
  muteBtn.addEventListener('click', () => setMuted(ch.id, !muted[ch.id]));
  actions.appendChild(muteBtn);

  const chatBtn = document.createElement('button');
  chatBtn.className = 'icon-btn';
  chatBtn.textContent = 'Chat';
  chatBtn.title = 'Abrir chat oficial da Kick numa janela pop-up';
  chatBtn.addEventListener('click', () => openChatPopup(ch.id));
  actions.appendChild(chatBtn);

  const fsBtn = document.createElement('button');
  fsBtn.className = 'icon-btn';
  fsBtn.textContent = 'Tela cheia';
  fsBtn.addEventListener('click', () => {
    if (playerWrap.requestFullscreen) playerWrap.requestFullscreen().catch(() => { });
  });
  actions.appendChild(fsBtn);

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'icon-btn';
  reloadBtn.textContent = '↻';
  reloadBtn.title = 'Recarregar esta live';
  reloadBtn.addEventListener('click', () => { iframe.src = playerSrc(ch.id, true); });
  actions.appendChild(reloadBtn);

  bar.appendChild(handle);
  bar.appendChild(actions);

  const playerWrap = document.createElement('div');
  playerWrap.className = 'player-wrap';

  const iframe = document.createElement('iframe');
  iframe.src = playerSrc(ch.id, false);
  iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';

  const badge = document.createElement('img');
  badge.className = 'brand-badge';
  // badge.alt = 'Logo';
  // badge.src = 'https://deserthon.streamerkit.net/crest.png';

  playerWrap.appendChild(iframe);
  playerWrap.appendChild(badge);

  item.appendChild(bar);
  item.appendChild(playerWrap);

  handle.addEventListener('pointerdown', (e) => {
    handle.setPointerCapture(e.pointerId);
    dragChannel = ch.id;
    item.classList.add('dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (dragChannel !== ch.id) return;
    grid.querySelectorAll('.stream-item').forEach(it => it.classList.remove('drop-target'));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const target = under && under.closest ? under.closest('.stream-item') : null;
    if (target && target.dataset.channel !== ch.id) target.classList.add('drop-target');
  });
  const finishDrag = (e) => {
    if (dragChannel !== ch.id) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const target = under && under.closest ? under.closest('.stream-item') : null;
    try { handle.releasePointerCapture(e.pointerId); } catch (err) { }
    clearDragVisuals();
    dragChannel = null;
    if (target && target.dataset.channel) swap(ch.id, target.dataset.channel);
  };
  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', () => { dragChannel = null; clearDragVisuals(); });

  elements[ch.id] = { item, iframe, muteBtn, focusBtn, playerWrap };
  setMuted(ch.id, muted[ch.id]); // sincroniza texto/estado do botão de volume
  return item;
}

function positionAll() {
  channels.forEach(ch => {
    const slot = assignment[ch.id];
    const el = elements[ch.id];
    el.item.style.gridArea = slot;
    const isMain = slot === 'main';
    el.item.classList.toggle('is-main', isMain);
    el.focusBtn.style.display = isMain ? 'none' : '';
  });
}

// monta a live em destaque + as 3 miniaturas
channels.forEach(ch => grid.appendChild(buildStreamItem(ch)));

// painel de chat (não é um canal, fica fixo na área "chat")
const chatPanel = document.createElement('div');
chatPanel.className = 'chat-panel';
chatPanel.innerHTML = `
    <div class="stream-bar">
      <span class="stream-name" id="chatTitle">Chat</span>
    </div>
    <div class="chat-body">
      <iframe id="chatFrame" title="Chat da Kick" loading="lazy"></iframe>
    </div>
  `;
grid.appendChild(chatPanel);
const chatTitle = chatPanel.querySelector('#chatTitle');
const chatFrame = chatPanel.querySelector('#chatFrame');

positionAll();
updateChatPanel();

document.getElementById('reloadAll').addEventListener('click', () => {
  channels.forEach(ch => { elements[ch.id].iframe.src = playerSrc(ch.id, true); });
});
