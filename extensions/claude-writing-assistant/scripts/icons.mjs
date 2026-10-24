// Renders the extension and command icons (512×512 PNG) from the SVG sources below.
// Run with `npm run icons`; the PNGs go to assets/ and assets/commands/.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT = "/System/Library/Fonts/SFNSRounded.ttf";

const CREAM = "#FFF6EC";
const CORAL = "#F28A66";

const PALETTES = {
  // In-place edits
  coral: ["#F49A78", "#D2603F", "#B9472D"],
  // Ask, read and records
  ink: ["#3A3641", "#232128", "#141317"],
  // Screen capture
  sky: ["#7DB5E6", "#4F86C2", "#36679F"],
};

function tile(palette, glyph) {
  const [top, mid, bottom] = PALETTES[palette];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <!-- User-space units: a horizontal line has a zero-height bounding box and would vanish. -->
    <linearGradient id="coral" gradientUnits="userSpaceOnUse" x1="180" y1="100" x2="300" y2="420">
      <stop offset="0" stop-color="#F7A27F"/>
      <stop offset="1" stop-color="#E06F4B"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
      <feOffset dy="8" result="blur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.32"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dy="5"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="36" y="32" width="440" height="440" rx="104" fill="url(#bg)"/>
    <rect x="36" y="32" width="440" height="440" rx="104" fill="url(#shine)"/>
    <rect x="37.5" y="33.5" width="437" height="437" rx="102.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="3"/>
  </g>
  <g filter="url(#lift)" fill="none" stroke="${CREAM}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
    ${glyph}
  </g>
</svg>`;
}

/** Bold rounded letter: the variable font renders at Regular, so a same-colour stroke adds weight. */
function letter(char, x, y, size, color = CREAM, weight = 10) {
  return `<text x="${x}" y="${y}" font-family=".SF NS Rounded" font-size="${size}" text-anchor="middle" fill="${color}" stroke="${color}" stroke-width="${weight}" stroke-linejoin="round">${char}</text>`;
}

/** Four-pointed sparkle centred on (cx, cy). */
function sparkle(cx, cy, r, color = CREAM) {
  const k = r * 0.22;
  return `<path d="M ${cx} ${cy - r} C ${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} C ${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} C ${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} C ${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r} Z" fill="${color}" stroke="none"/>`;
}

/** Six-ray asterisk, the extension's mark. */
function asterisk(cx, cy, r, width, stroke = "url(#coral)") {
  return [90, 30, 150]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      return `<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" stroke="${stroke}" stroke-width="${width}"/>`;
    })
    .join("");
}

/** The four corners of a screen-capture viewfinder. */
function viewfinder(inset = 112, arm = 62) {
  const a = inset;
  const b = 512 - inset;
  const t = inset - 4;
  const u = 512 - inset - 4;
  return `<path d="M ${a} ${t + arm} V ${t + 8} Q ${a} ${t} ${a + 8} ${t} H ${a + arm}"/>
    <path d="M ${b - arm} ${t} H ${b - 8} Q ${b} ${t} ${b} ${t + 8} V ${t + arm}"/>
    <path d="M ${b} ${u - arm} V ${u - 8} Q ${b} ${u} ${b - 8} ${u} H ${b - arm}"/>
    <path d="M ${a + arm} ${u} H ${a + 8} Q ${a} ${u} ${a} ${u - 8} V ${u - arm}"/>`;
}

function bubble(x, y, w, h, tailX, { fill = "none", stroke = CREAM, width = 30 } = {}) {
  const r = 46;
  const bottom = y + h;
  return `<path d="M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${bottom - r} Q ${x + w} ${bottom} ${x + w - r} ${bottom} H ${tailX + 34} L ${tailX - 6} ${bottom + 44} L ${tailX} ${bottom} H ${x + r} Q ${x} ${bottom} ${x} ${bottom - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
}

const ICONS = {
  // Extension mark: a Claude-coloured asterisk with a typing cursor.
  icon: tile(
    "ink",
    `${asterisk(226, 250, 122, 52)}
     <line x1="384" y1="292" x2="384" y2="404" stroke="${CREAM}" stroke-width="28"/>`,
  ),

  "commands/translate-replace": tile(
    "coral",
    `${letter("A", 170, 248, 176)}
     ${letter("Ş", 340, 418, 176)}
     <path d="M 300 132 Q 392 132 392 222" />
     <path d="M 366 200 L 392 228 L 418 200" />
     <path d="M 212 380 Q 120 380 120 290" />
     <path d="M 94 312 L 120 284 L 146 312" />`,
  ),
  "commands/translate-to": tile(
    "coral",
    `<circle cx="228" cy="284" r="112" stroke-width="26"/>
     <ellipse cx="228" cy="284" rx="48" ry="112" stroke-width="20"/>
     <line x1="116" y1="284" x2="340" y2="284" stroke-width="20"/>
     <line x1="300" y1="146" x2="392" y2="146" stroke-width="28"/>
     <path d="M 360 112 L 396 146 L 360 180" stroke-width="28"/>`,
  ),
  "commands/fix-grammar": tile(
    "coral",
    `<path d="M 150 222 L 222 294 L 362 154" stroke-width="42"/>
     <path d="M 130 372 Q 155 342 180 372 T 230 372 T 280 372 T 330 372 T 380 372" stroke-width="24"/>`,
  ),
  "commands/improve-writing": tile(
    "coral",
    `${sparkle(222, 282, 128)} ${sparkle(358, 158, 62)} ${sparkle(372, 352, 40)}`,
  ),
  "commands/change-tone": tile(
    "coral",
    `${bubble(112, 118, 288, 220, 186)}
     <line x1="168" y1="194" x2="344" y2="194" stroke-width="20"/>
     <line x1="168" y1="262" x2="344" y2="262" stroke-width="20"/>
     <circle cx="300" cy="194" r="24" fill="${CREAM}" stroke="none"/>
     <circle cx="212" cy="262" r="24" fill="${CREAM}" stroke="none"/>`,
  ),
  "commands/transform": tile(
    "coral",
    `<line x1="146" y1="372" x2="318" y2="200" stroke-width="40"/>
     <line x1="318" y1="200" x2="350" y2="168" stroke-width="40" stroke="#7A2B19" stroke-opacity="0.35"/>
     ${sparkle(372, 148, 54)} ${sparkle(230, 152, 30)} ${sparkle(380, 296, 30)}`,
  ),

  "commands/translate": tile(
    "ink",
    `<rect x="118" y="214" width="180" height="70" rx="20" fill="${CORAL}" stroke="none"/>
     <line x1="132" y1="154" x2="330" y2="154" stroke-width="26"/>
     <line x1="140" y1="249" x2="276" y2="249" stroke-width="26"/>
     <line x1="132" y1="344" x2="262" y2="344" stroke-width="26"/>
     <circle cx="378" cy="330" r="62" stroke-width="22"/>
     <ellipse cx="378" cy="330" rx="25" ry="62" stroke-width="16"/>
     <line x1="316" y1="330" x2="440" y2="330" stroke-width="16"/>`,
  ),
  "commands/translator": tile(
    "ink",
    `<circle cx="256" cy="252" r="138"/>
     <ellipse cx="256" cy="252" rx="62" ry="138" stroke-width="24"/>
     <line x1="124" y1="206" x2="388" y2="206" stroke-width="22"/>
     <line x1="124" y1="298" x2="388" y2="298" stroke-width="22"/>
     <line x1="256" y1="114" x2="256" y2="390" stroke="${CORAL}" stroke-width="22"/>`,
  ),
  "commands/ask": tile(
    "ink",
    `${bubble(102, 108, 308, 236, 178)}
     ${asterisk(256, 226, 66, 30)}`,
  ),
  "commands/ask-selection": tile(
    "ink",
    `<rect x="118" y="214" width="204" height="70" rx="20" fill="${CORAL}" stroke="none"/>
     <line x1="132" y1="154" x2="330" y2="154" stroke-width="26"/>
     <line x1="140" y1="249" x2="300" y2="249" stroke-width="26"/>
     <line x1="132" y1="344" x2="300" y2="344" stroke-width="26"/>
     ${letter("?", 374, 300, 150, CREAM, 8)}`,
  ),
  "commands/ai-commands": tile(
    "ink",
    `<path d="M 206 206 H 306 V 306 H 206 Z" stroke-width="26"/>
     <path d="M 206 206 V 170 A 36 36 0 1 0 170 206 Z" stroke-width="26"/>
     <path d="M 306 206 V 170 A 36 36 0 1 1 342 206 Z" stroke-width="26"/>
     <path d="M 306 306 V 342 A 36 36 0 1 0 342 306 Z" stroke-width="26"/>
     <path d="M 206 306 V 342 A 36 36 0 1 1 170 306 Z" stroke-width="26"/>
     ${sparkle(384, 128, 48, CORAL)}`,
  ),
  "commands/page-summary": tile(
    "ink",
    `<rect x="104" y="112" width="304" height="280" rx="40"/>
     <line x1="104" y1="178" x2="408" y2="178" stroke-width="24"/>
     <circle cx="148" cy="145" r="11" fill="${CORAL}" stroke="none"/>
     <circle cx="184" cy="145" r="11" fill="${CREAM}" stroke="none" opacity="0.7"/>
     <line x1="150" y1="240" x2="362" y2="240" stroke-width="22"/>
     <line x1="150" y1="288" x2="330" y2="288" stroke-width="22"/>
     <line x1="150" y1="336" x2="262" y2="336" stroke="${CORAL}" stroke-width="22"/>`,
  ),
  "commands/conversations": tile(
    "ink",
    `${bubble(170, 178, 236, 172, 352, { fill: CORAL, stroke: CORAL, width: 26 })}
     ${bubble(106, 110, 236, 172, 160, { fill: "#232128", stroke: CREAM, width: 28 })}
     <line x1="160" y1="178" x2="288" y2="178" stroke-width="22"/>
     <line x1="160" y1="226" x2="250" y2="226" stroke-width="22"/>`,
  ),
  "commands/history": tile(
    "ink",
    `<path d="M 142 196 A 132 132 0 1 1 124 262"/>
     <path d="M 104 170 L 142 200 L 176 162"/>
     <path d="M 256 178 V 262 L 312 302" stroke="${CORAL}"/>`,
  ),
  "commands/usage": tile(
    "ink",
    `<line x1="116" y1="380" x2="396" y2="380" stroke-width="24"/>
     <line x1="166" y1="330" x2="166" y2="270" stroke-width="46"/>
     <line x1="256" y1="330" x2="256" y2="206" stroke-width="46"/>
     <line x1="346" y1="330" x2="346" y2="138" stroke="${CORAL}" stroke-width="46"/>`,
  ),

  "commands/screen-translate": tile(
    "sky",
    `${viewfinder()}
     <circle cx="256" cy="252" r="78" stroke-width="22"/>
     <ellipse cx="256" cy="252" rx="34" ry="78" stroke-width="18"/>
     <line x1="180" y1="252" x2="332" y2="252" stroke-width="18"/>`,
  ),
  "commands/screen-ask": tile("sky", `${viewfinder()} ${letter("?", 256, 314, 190, CREAM, 10)}`),
  "commands/screen-text": tile(
    "sky",
    `${viewfinder()}
     <line x1="186" y1="206" x2="326" y2="206" stroke-width="24"/>
     <line x1="186" y1="254" x2="326" y2="254" stroke-width="24"/>
     <line x1="186" y1="302" x2="276" y2="302" stroke-width="24"/>`,
  ),
};

const only = process.argv.slice(2);
for (const [name, svg] of Object.entries(ICONS)) {
  if (only.length && !only.includes(name)) continue;
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 512 },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: ".SF NS Rounded" },
  })
    .render()
    .asPng();
  const out = join(root, "assets", `${name}.png`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log(`✓ assets/${name}.png`);
}
