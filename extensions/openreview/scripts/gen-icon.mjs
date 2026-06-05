// Generates assets/icon.png: a 512x512 rounded square in OpenReview blue
// with a white "OR" wordmark drawn from a simple pixel grid. No deps beyond
// Node's zlib. Run: node scripts/gen-icon.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const S = 512;
const bg = [31, 58, 95, 255]; // #1f3a5f
const fg = [255, 255, 255, 255];
const transparent = [0, 0, 0, 0];
const radius = 96;

// 5x7 bitmap font for 'O' and 'R'
const FONT = {
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
};

function inRoundedRect(x, y) {
  const minX = radius,
    minY = radius,
    maxX = S - radius,
    maxY = S - radius;
  if (x >= minX && x <= maxX) return y >= 0 && y < S;
  if (y >= minY && y <= maxY) return x >= 0 && x < S;
  // corners
  const cx = x < minX ? minX : maxX;
  const cy = y < minY ? minY : maxY;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

// Layout the two glyphs centered
const cell = 36; // px per font pixel
const glyphW = 5 * cell;
const glyphH = 7 * cell;
const gap = 24;
const totalW = glyphW * 2 + gap;
const startX = Math.round((S - totalW) / 2);
const startY = Math.round((S - glyphH) / 2);

function glyphPixel(x, y) {
  for (let g = 0; g < 2; g++) {
    const gx = startX + g * (glyphW + gap);
    if (x < gx || x >= gx + glyphW || y < startY || y >= startY + glyphH) continue;
    const col = Math.floor((x - gx) / cell);
    const row = Math.floor((y - startY) / cell);
    const rows = g === 0 ? FONT.O : FONT.R;
    if (rows[row] && rows[row][col] === "1") return true;
  }
  return false;
}

const raw = Buffer.alloc(S * (S * 4 + 1));
let p = 0;
for (let y = 0; y < S; y++) {
  raw[p++] = 0; // filter type 0
  for (let x = 0; x < S; x++) {
    let px;
    if (!inRoundedRect(x, y)) px = transparent;
    else if (glyphPixel(x, y)) px = fg;
    else px = bg;
    raw[p++] = px[0];
    raw[p++] = px[1];
    raw[p++] = px[2];
    raw[p++] = px[3];
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

mkdirSync(new URL("../assets/", import.meta.url), { recursive: true });
writeFileSync(new URL("../assets/icon.png", import.meta.url), png);
console.log(`wrote assets/icon.png (${png.length} bytes)`);
