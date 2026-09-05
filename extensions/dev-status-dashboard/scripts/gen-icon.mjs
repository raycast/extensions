// Dependency-free 512×512 PNG generator for the extension icon.
// Draws a rounded dark tile with three status rows (green / amber / red dot + bar),
// evoking a status dashboard. Anti-aliased via signed-distance coverage.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const S = 512;
const buf = new Uint8ClampedArray(S * S * 4); // RGBA, starts transparent

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Signed distance to a rounded rectangle centered at (cx,cy).
function sdRoundRect(px, py, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(px - cx) - halfW + r;
  const dy = Math.abs(py - cy) - halfH + r;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - r;
}

function sdCircle(px, py, cx, cy, radius) {
  return Math.hypot(px - cx, py - cy) - radius;
}

// Alpha-over composite `color` (with coverage) onto the pixel at (x,y).
function over(x, y, [r, g, b], coverage) {
  if (coverage <= 0) return;
  const i = (y * S + x) * 4;
  const a = clamp(coverage, 0, 1);
  const dstA = buf[i + 3] / 255;
  const outA = a + dstA * (1 - a);
  if (outA <= 0) return;
  for (let k = 0; k < 3; k++) {
    const src = [r, g, b][k];
    buf[i + k] = (src * a + buf[i + k] * dstA * (1 - a)) / outA;
  }
  buf[i + 3] = outA * 255;
}

// Vertical background gradient between two colors.
function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Theme (2nd arg): "light" → dark navy tile for Raycast's light UI (default);
// "dark" → light tile so the icon still stands out on Raycast's dark UI.
const theme = process.argv[3] === "dark" ? "dark" : "light";
const TOP = theme === "dark" ? [240, 242, 246] : [43, 50, 69];
const BOT = theme === "dark" ? [220, 224, 231] : [22, 27, 38];
const BAR = theme === "dark" ? [150, 159, 176] : [86, 97, 122];
const GREEN = [63, 185, 80];
const AMBER = [210, 153, 34];
const RED = [248, 81, 73];

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    // Rounded tile background with gradient fill.
    const dTile = sdRoundRect(x + 0.5, y + 0.5, S / 2, S / 2, S / 2, S / 2, 112);
    const tileCov = clamp(0.5 - dTile, 0, 1);
    if (tileCov > 0) over(x, y, lerp(TOP, BOT, y / S), tileCov);
  }
}

// Three status rows.
const rows = [
  { cy: 170, dot: GREEN, barW: 150 },
  { cy: 256, dot: AMBER, barW: 200 },
  { cy: 342, dot: RED, barW: 120 },
];
const dotX = 150;
const dotR = 30;
const barX = 210;
const barH = 30;

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    for (const row of rows) {
      const dDot = sdCircle(x + 0.5, y + 0.5, dotX, row.cy, dotR);
      over(x, y, row.dot, clamp(0.5 - dDot, 0, 1));

      const barCx = barX + row.barW / 2;
      const dBar = sdRoundRect(x + 0.5, y + 0.5, barCx, row.cy, row.barW / 2, barH / 2, barH / 2);
      over(x, y, BAR, clamp(0.5 - dBar, 0, 1) * 0.9);
    }
  }
}

// --- PNG encoding ---
function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// raw image with per-row filter byte 0
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  Buffer.from(buf.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = process.argv[2] || "assets/icon.png";
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
