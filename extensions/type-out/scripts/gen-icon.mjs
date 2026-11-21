// Generates assets/icon.png (512x512): a dark rounded square with a white
// keycap outline and a "T" — no image libraries needed, pure PNG encoding.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 512;

const WHITE = [255, 255, 255, 255];
const BG = [31, 35, 51, 255]; // dark slate

const px = Buffer.alloc(SIZE * SIZE * 4);

function set(x, y, [r, g, b, a]) {
  const i = (y * SIZE + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
}

function insideRoundedRect(x, y, x0, y0, x1, y1, r) {
  const dx = Math.max(x0 + r - x, x - (x1 - r), 0);
  const dy = Math.max(y0 + r - y, y - (y1 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

function fillRoundedRect(x0, y0, x1, y1, r, color) {
  for (let y = Math.floor(y0); y < y1; y++) {
    for (let x = Math.floor(x0); x < x1; x++) {
      if (insideRoundedRect(x + 0.5, y + 0.5, x0, y0, x1, y1, r)) set(x, y, color);
    }
  }
}

// Background: rounded square covering the canvas
fillRoundedRect(0, 0, SIZE, SIZE, 100, BG);

// Keycap outline: white rounded rect stroke
const k0 = 104, k1 = 408, kr = 64, stroke = 14;
for (let y = k0; y < k1; y++) {
  for (let x = k0; x < k1; x++) {
    const p = { x: x + 0.5, y: y + 0.5 };
    const outer = insideRoundedRect(p.x, p.y, k0, k0, k1, k1, kr);
    const inner = insideRoundedRect(p.x, p.y, k0 + stroke, k0 + stroke, k1 - stroke, k1 - stroke, kr - stroke);
    if (outer && !inner) set(x, y, WHITE);
  }
}

// "T" glyph
fillRoundedRect(176, 176, 336, 218, 6, WHITE); // horizontal bar
fillRoundedRect(236, 176, 276, 340, 6, WHITE); // vertical bar

// --- PNG encoding ---
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
// compression (0), filter (0), interlace (0) already zero

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = join(root, "assets", "icon.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
