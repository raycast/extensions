// Generates the layout-diagram SVGs bundled into assets/diagrams/.
// Run: npm run diagrams
//
// Diagrams are PURE LAYOUT SCHEMATICS and deliberately contain no key glyphs:
// the same asset has to be correct for any user's keybindings, so the keystroke
// is rendered from their live config alongside the image, never baked in here.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'diagrams');
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- tokens
// Raycast chrome, approximated from the live app (dark theme primary).
const T = {
  dark: {
    backdrop: '#2b2b2f', win: '#1e1e1f', border: 'rgba(255,255,255,0.09)',
    divider: 'rgba(255,255,255,0.09)', text: 'rgba(255,255,255,0.92)',
    sec: 'rgba(255,255,255,0.45)', ter: 'rgba(255,255,255,0.28)',
    sel: 'rgba(255,255,255,0.09)', tagBg: 'rgba(255,255,255,0.10)',
    tagAltBg: 'rgba(255,255,255,0.05)', codeBg: 'rgba(255,255,255,0.08)',
    shadow: '0 24px 70px rgba(0,0,0,0.55)',
    menuBar: 'rgba(28,28,30,0.92)', menu: 'rgba(40,40,42,0.98)',
  },
  light: {
    backdrop: '#d6d6db', win: '#f6f6f7', border: 'rgba(0,0,0,0.10)',
    divider: 'rgba(0,0,0,0.09)', text: 'rgba(0,0,0,0.88)',
    sec: 'rgba(0,0,0,0.45)', ter: 'rgba(0,0,0,0.28)',
    sel: 'rgba(0,0,0,0.06)', tagBg: 'rgba(0,0,0,0.07)',
    tagAltBg: 'rgba(0,0,0,0.035)', codeBg: 'rgba(0,0,0,0.06)',
    shadow: '0 24px 70px rgba(0,0,0,0.28)',
    menuBar: 'rgba(236,236,238,0.92)', menu: 'rgba(246,246,248,0.98)',
  },
};
// Raycast `Color.*` enum, as it renders in the dark theme.
const C = {
  blue: '#3a86ff', green: '#30d158', magenta: '#ff2d88', orange: '#ff9f0a',
  purple: '#bf5af2', red: '#ff453a', yellow: '#ffd60a',
};
// Diagram palettes — one per theme. Raycast swaps `foo.svg` ↔ `foo@dark.svg` automatically,
// so each palette is tuned for its own ground instead of compromising on a middle gray.
// Colors are [hex, opacity] and are emitted as separate `fill`/`fill-opacity`
// attributes. NOT as rgba().
//
// `fill="rgba(255,255,255,0.2)"` is CSS Color 4, which browsers accept in an SVG
// presentation attribute but plain SVG does not. Raycast's renderer rejects the value
// and falls back to BLACK, so every window in every diagram painted solid black while
// looking correct in a browser. Found by sampling a real capture: the fill measured
// rgb(0,0,0) against a rgb(58,58,59) pane, which no alpha over that ground can produce.
const PAL = {
  dark: {
    mid: ['#98989d', 1],
    winFill: ['#ffffff', 0.2], winStroke: ['#ffffff', 0.78],
    screen: ['#ffffff', 0.4],
    acc: ['#409cff', 1], accFill: ['#0a84ff', 0.42], partnerFill: ['#0a84ff', 0.18],
  },
  light: {
    mid: ['#6e6e73', 1],
    winFill: ['#000000', 0.07], winStroke: ['#000000', 0.52],
    screen: ['#000000', 0.26],
    acc: ['#007aff', 1], accFill: ['#007aff', 0.18], partnerFill: ['#007aff', 0.07],
  },
};

/** `fill`/`stroke` plus its matching `-opacity`, omitting opacity when fully opaque. */
const paint = (kind, [hex, alpha]) => `${kind}="${hex}"${alpha < 1 ? ` ${kind}-opacity="${alpha}"` : ''}`;
let D = PAL.dark;
function withD(theme, fn) { const prev = D; D = PAL[theme]; try { return fn(); } finally { D = prev; } }

// ---------------------------------------------------------------- icons (16px, stroke 1.5)
const P = (d, extra = '') => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const R = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`;
const ICON = {
  'arrow-left':  P('<path d="M13 8H3M7 4 3 8l4 4"/>'),
  'arrow-right': P('<path d="M3 8h10M9 4l4 4-4 4"/>'),
  'arrow-up':    P('<path d="M8 13V3M4 7l4-4 4 4"/>'),
  'arrow-down':  P('<path d="M8 3v10M4 9l4 4 4-4"/>'),
  'monitor-arrows': P('<rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 14h4M5 7h6M6.5 5.5 5 7l1.5 1.5M9.5 5.5 11 7 9.5 8.5"/>'),
  'sidebar-left': P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6.5 3v10M6.5 8H14"/>'),
  'grid-2x2':    P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M8 3v10M2 8h12"/>'),
  'columns-3':   P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6 3v10M10 3v10"/>'),
  'undo':        P('<path d="M3 6h7a3 3 0 0 1 0 6H6M5.5 3.5 3 6l2.5 2.5"/>'),
  'join':        P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M7 3v10M7 8h7"/><path d="M4.5 6v4" stroke-dasharray="1.2 1.4"/>'),
  'columns':     P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M8 3v10"/>'),
  'rows':        P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 8h12"/>'),
  'flatten':     P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6 3v10M10 3v10"/><path d="M6 8h4" stroke-dasharray="1.2 1.4"/>'),
  'balance':     P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M8 3v10M4.5 8h2M9.5 8h2M5.5 7 4.5 8l1 1M10.5 7l1 1-1 1"/>'),
  'expand':      P('<path d="M9.5 2.5H13.5V6.5M6.5 13.5H2.5V9.5M13.5 2.5 9 7M2.5 13.5 7 9"/>'),
  'width':       P('<path d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5"/>'),
  'height':      P('<path d="M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5"/>'),
  'tiles':       P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M8 3v10M8 8h6"/>'),
  'accordion':   P('<rect x="2" y="2.5" width="12" height="3" rx="1"/><rect x="2" y="6.5" width="12" height="3" rx="1"/><rect x="2" y="10.5" width="12" height="3" rx="1"/>'),
  'maximize':    P('<path d="M9.5 2.5H13.5V6.5M6.5 13.5H2.5V9.5"/>'),
  'float':       P('<rect x="2" y="2" width="9" height="7" rx="1.5"/><path d="M5 12h9V5"/>'),
  'desktop':     P('<rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 14h4M8 11v3"/>'),
  'send':        P('<rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 14h4M5.5 7h5M8.5 5 10.5 7l-2 2"/>'),
  'repeat':      P('<path d="M3 6.5h8.5L9.5 4.5M13 9.5H4.5l2 2"/>'),
  'cycle':       P('<path d="M5.5 3H3.5v10h2M10.5 3h2v10h-2"/><path d="M6.5 8h3"/>'),
  'gear':        P('<circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1"/>'),
  'reload':      P('<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3"/>'),
  'close-all':   P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6 6l4 4M10 6l-4 4"/>'),
  'search':      P('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>'),
  'warning':     P('<path d="M8 2.5 14 13H2Z"/><path d="M8 6.5v3M8 11.5v.2"/>'),
  'question':    P('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6.5 6.5a1.5 1.5 0 1 1 2 1.4c-.4.2-.5.5-.5.9M8 11v.2"/>'),
  'chevron-down': P('<path d="M4 6l4 4 4-4"/>'),
  'chevron-left': P('<path d="M10 3 5 8l5 5"/>'),
  'app':         P('<rect x="2" y="2" width="12" height="12" rx="3"/><path d="M6 8h4M8 6v4"/>'),
  'text':        P('<path d="M3 4h10M3 8h10M3 12h6"/>'),
};
// Extension icon for the footer (a tiled rounded square).
const APPICON = `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="#3a86ff"/><rect x="3.5" y="3.5" width="4" height="9" rx="1" fill="#fff" opacity=".92"/><rect x="8.5" y="3.5" width="4" height="4" rx="1" fill="#fff" opacity=".92"/><rect x="8.5" y="8.5" width="4" height="4" rx="1" fill="#fff" opacity=".92"/></svg>`;

// ---------------------------------------------------------------- diagram system
// A layout is a tree: { axis:'h'|'v', kids:[...] } | { id, focus, partner, weight, arrow }.
function placeTree(node, x, y, w, h, gap, out, depth) {
  if (node.kids) {
    const horiz = node.axis === 'h';
    const total = horiz ? w : h;
    const sum = node.kids.reduce((s, k) => s + (k.weight || 1), 0);
    const free = total - gap * (node.kids.length - 1);
    let pos = 0;
    for (const k of node.kids) {
      const size = free * (k.weight || 1) / sum;
      if (horiz) placeTree(k, x + pos, y, size, h, gap, out, depth + 1);
      else placeTree(k, x, y + pos, w, size, gap, out, depth + 1);
      pos += size + gap;
    }
    if (depth > 0) out.push({ type: 'container', x, y, w, h, axis: node.axis, hi: node.hi });
  } else out.push({ type: 'win', x, y, w, h, ...node });
}

// One workspace "screen". W×H default 132×84 (≈16:10).
function screen(tree, { W = 132, H = 84, inset = 6, gap = 4, ox = 0, oy = 0, label, labelSize = 10 } = {}) {
  const parts = [];
  placeTree(tree, ox + inset, oy + inset, W - inset * 2, H - inset * 2, gap, parts, 0);
  let s = `<rect x="${ox + .5}" y="${oy + .5}" width="${W - 1}" height="${H - 1}" rx="6" fill="none" ${paint('stroke', D.screen)} stroke-width="1"/>`;
  // containers first (behind), then windows
  for (const p of parts.filter(p => p.type === 'container')) {
    s += `<rect x="${p.x - 2.5}" y="${p.y - 2.5}" width="${p.w + 5}" height="${p.h + 5}" rx="4.5" fill="none" ${paint('stroke', p.hi ? D.acc : D.mid)} stroke-width="1" stroke-dasharray="2.5 2" opacity="${p.hi ? .9 : .75}"/>`;
  }
  for (const p of parts.filter(p => p.type === 'win')) {
    const fill = p.focus ? D.accFill : p.partner ? D.partnerFill : D.winFill;
    const stroke = p.focus || p.partner ? D.acc : D.winStroke;
    const sw = p.focus ? 1.75 : 1.25;
    const dash = p.partner ? ' stroke-dasharray="3 2"' : '';
    s += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" ${paint('fill', fill)} ${paint('stroke', stroke)} stroke-width="${sw}"${dash}/>`;
    if (p.id) s += `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2}" font-size="${labelSize}" font-weight="${p.focus ? 600 : 500}" ${paint('fill', p.focus ? D.acc : D.mid)} text-anchor="middle" dominant-baseline="central" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif">${p.id}</text>`;
    if (p.arrow) {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, L = 14;
      const dx = { left: -1, right: 1, up: 0, down: 0 }[p.arrow], dy = { left: 0, right: 0, up: -1, down: 1 }[p.arrow];
      const x1 = cx + dx * (p.w / 2 - 4), y1 = cy + dy * (p.h / 2 - 4);
      const x2 = x1 + dx * L, y2 = y1 + dy * L;
      s += `<path d="M${x1} ${y1}L${x2} ${y2}" ${paint('stroke', D.acc)} stroke-width="1.75" stroke-linecap="round"/>`;
      const hx = -dy, hy = dx; // perpendicular
      s += `<path d="M${x2 - dx * 4 + hx * 3.5} ${y2 - dy * 4 + hy * 3.5}L${x2} ${y2}L${x2 - dx * 4 - hx * 3.5} ${y2 - dy * 4 - hy * 3.5}" fill="none" ${paint('stroke', D.acc)} stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  if (label) s += `<text x="${ox + W / 2}" y="${oy + H + 12}" font-size="9.5" ${paint('fill', D.mid)} text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif">${label}</text>`;
  return s;
}
const FONT = `-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif`;
function arrowGlyph(x, y, w = 22) {
  return `<path d="M${x} ${y}h${w - 5}M${x + w - 10} ${y - 4.5}l5 4.5-5 4.5" fill="none" ${paint('stroke', D.mid)} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function svgWrap(w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}
// before → after
function beforeAfter(before, after, { W = 132, H = 84, keys } = {}) {
  const gapX = 44, h = H + 18;
  let s = screen(before, { W, H, label: 'before' });
  s += arrowGlyph(W + 11, H / 2, 22);
  if (keys) s += `<text x="${W + gapX / 2}" y="${H / 2 + 16}" font-size="9.5" ${paint('fill', D.mid)} text-anchor="middle" font-family="${FONT}">${keys}</text>`;
  s += screen(after, { W, H, ox: W + gapX, label: 'after' });
  return svgWrap(W * 2 + gapX, h, s);
}
// n states in a row with the key pressed between each (recipe storyboard)
function storyboard(states, { W = 100, H = 64 } = {}) {
  const gapX = 38, h = H + 30;
  let s = '', x = 0;
  states.forEach((st, i) => {
    s += screen(st.tree, { W, H, ox: x, label: st.label, labelSize: 9 });
    if (i < states.length - 1) {
      s += arrowGlyph(x + W + 10, H / 2, 20);
      // Frames carry no key label: the diagram is a shared asset and the keystroke
      // differs per user, so the step keys are rendered from live config alongside.
      if (st.key) {
        s += `<text x="${x + W + gapX / 2}" y="${H / 2 + 15}" font-size="9.5" font-weight="600" ${paint('fill', D.mid)} text-anchor="middle" font-family="${FONT}">${st.key}</text>`;
      }
    }
    x += W + gapX;
  });
  return svgWrap(x - gapX, h, s);
}
const single = (tree, o = {}) => svgWrap(o.W || 132, (o.H || 84) + (o.label ? 16 : 0), screen(tree, o));

const w = (id, o = {}) => ({ id, ...o });
const h = (...kids) => ({ axis: 'h', kids });
const v = (...kids) => ({ axis: 'v', kids });
const hi = (t) => ({ ...t, hi: true });

// The diagrams used by the artboards (also written to diagrams/*.svg + *@dark.svg as assets).
const buildDiagrams = () => ({
  'join-right': beforeAfter(
    h(w('A'), w('B', { focus: 1 }), w('C', { partner: 1 })),
    h(w('A'), hi(v(w('B', { focus: 1 }), w('C'))))),
  'join-down': beforeAfter(
    h(w('A'), v(w('B', { focus: 1 }), w('C', { partner: 1 }), w('D'))),
    h(w('A'), v(hi(h(w('B', { focus: 1 }), w('C'))), w('D')))),
  'join-left': beforeAfter(
    h(w('A', { partner: 1 }), w('B', { focus: 1 }), w('C')),
    h(hi(v(w('B', { focus: 1 }), w('A'))), w('C'))),
  'join-up': beforeAfter(
    h(w('A'), v(w('B', { partner: 1 }), w('C', { focus: 1 }), w('D'))),
    h(w('A'), v(hi(h(w('C', { focus: 1 }), w('B'))), w('D')))),
  // One per direction: a diagram showing a rightward arrow on a "focus left" row
  // would actively mislead, so every direction gets its own asset.
  'focus-right': beforeAfter(
    h(w('A'), w('B', { focus: 1, arrow: 'right' }), w('C')),
    h(w('A'), w('B'), w('C', { focus: 1 }))),
  'focus-left': beforeAfter(
    h(w('A'), w('B', { focus: 1, arrow: 'left' }), w('C')),
    h(w('A', { focus: 1 }), w('B'), w('C'))),
  'focus-down': beforeAfter(
    v(w('A'), w('B', { focus: 1, arrow: 'down' }), w('C')),
    v(w('A'), w('B'), w('C', { focus: 1 }))),
  'focus-up': beforeAfter(
    v(w('A'), w('B', { focus: 1, arrow: 'up' }), w('C')),
    v(w('A', { focus: 1 }), w('B'), w('C'))),
  'move-right': beforeAfter(
    h(w('A'), w('B', { focus: 1, arrow: 'right' }), w('C')),
    h(w('A'), w('C'), w('B', { focus: 1 }))),
  'move-left': beforeAfter(
    h(w('A'), w('B', { focus: 1, arrow: 'left' }), w('C')),
    h(w('B', { focus: 1 }), w('A'), w('C'))),
  'move-down': beforeAfter(
    v(w('A'), w('B', { focus: 1, arrow: 'down' }), w('C')),
    v(w('A'), w('C'), w('B', { focus: 1 }))),
  'move-up': beforeAfter(
    v(w('A'), w('B', { focus: 1, arrow: 'up' }), w('C')),
    v(w('B', { focus: 1 }), w('A'), w('C'))),
  'root-columns': beforeAfter(v(w('A', { focus: 1 }), w('B'), w('C')), h(w('A', { focus: 1 }), w('B'), w('C'))),
  'root-rows': beforeAfter(h(w('A', { focus: 1 }), w('B'), w('C')), v(w('A', { focus: 1 }), w('B'), w('C'))),
  'flatten': beforeAfter(h(w('A'), v(w('B', { focus: 1 }), w('C')), w('D')), h(w('A'), w('B', { focus: 1 }), w('C'), w('D'))),
  'balance': beforeAfter(h(w('A', { weight: 2.6, focus: 1 }), v(w('B', { weight: 2 }), w('C'))), h(w('A', { focus: 1 }), v(w('B'), w('C')))),
  'recipe-left-strip': single(h(w('1'), v(w('2'), w('3'), w('4'))), { W: 160, H: 100 }),
  'recipe-2x2': single(h(v(w('1'), w('2')), v(w('3'), w('4'))), { W: 160, H: 100 }),
  'recipe-three-columns': single(h(w('1'), w('2'), w('3')), { W: 160, H: 100 }),
  'recipe-reset': single(h(w('1'), w('2'), w('3'), w('4')), { W: 160, H: 100 }),
  'recipe-left-strip-steps': storyboard([
    { tree: h(w('1'), w('2'), w('3'), w('4')), label: '1 · columns' },
    { tree: h(w('1'), w('2', { focus: 1 }), w('3', { partner: 1 }), w('4')), label: '2 · focus 2' },
    { tree: h(w('1'), hi(v(w('2', { focus: 1 }), w('3'))), w('4', { partner: 1 })), label: '3 · joined → stack' },
    { tree: h(w('1'), v(w('2'), w('3'), w('4', { focus: 1 }))), label: '4 · 4 pushed in' },
  ], { W: 92, H: 60 }),
});
const DIAGS = { dark: withD('dark', buildDiagrams), light: withD('light', buildDiagrams) };
const DIAG = DIAGS.dark;
// Standalone .svg files carry ⌃⌥⌘ glyphs, so declare the encoding explicitly rather than
// relying on the consumer defaulting to UTF-8. Only on disk — never inline in the artboard HTML.
const XMLDECL = '<?xml version="1.0" encoding="UTF-8"?>\n';
for (const [k, svg] of Object.entries(DIAGS.light)) writeFileSync(join(OUT, `${k}.svg`), XMLDECL + svg, 'utf8');
for (const [k, svg] of Object.entries(DIAGS.dark)) writeFileSync(join(OUT, `${k}@dark.svg`), XMLDECL + svg, 'utf8');
// Render sizes (raycast-width × raycast-height) — the SVG's own width/height, so nothing scales.
const SIZE = Object.fromEntries(Object.entries(DIAG).map(([k, s]) => [k, s.match(/width="(\d+)" height="(\d+)"/).slice(1, 3).map(Number)]));

// Sizes are the SVGs' own intrinsic dimensions, consumed as ?raycast-width/height
// so Raycast never scales them. Emitted for the extension to import.
// Sizes live in src/ so the extension can import them directly; assets/ is for
// files Raycast bundles, and a stray .json there would just be dead weight.
// Written in Prettier's own shape (each pair on one line). JSON.stringify's default
// expansion disagrees with it, so `ray lint --fix` and this generator would otherwise
// rewrite the file against each other on every run.
const sizesJson = `{\n${Object.entries(SIZE)
  .map(([k, [w, h]]) => `  ${JSON.stringify(k)}: [${w}, ${h}]`)
  .join(',\n')}\n}\n`;
writeFileSync(join(HERE, '..', 'src', 'lib', 'diagram-sizes.json'), sizesJson, 'utf8');
console.log(`wrote ${Object.keys(DIAGS.light).length * 2} SVGs to assets/diagrams/ + src/lib/diagram-sizes.json`);
