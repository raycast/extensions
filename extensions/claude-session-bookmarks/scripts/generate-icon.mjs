// Generates assets/command-icon.png (512x512) with no dependencies.
// A dark rounded panel with a green bookmark ribbon.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 512;
const H = 512;
const buf = Buffer.alloc(W * H * 4);

function px(x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

function fillRoundRect(x0, y0, x1, y1, rad, color) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cx = x < x0 + rad ? x0 + rad : x > x1 - rad ? x1 - rad : x;
      const cy = y < y0 + rad ? y0 + rad : y > y1 - rad ? y1 - rad : y;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rad * rad) px(x, y, color);
    }
  }
}

const PANEL = [28, 30, 38];
const GREEN = [52, 211, 153];

// Panel
fillRoundRect(56, 56, W - 56, H - 56, 96, PANEL);

// Bookmark ribbon
const rx0 = 196;
const rx1 = 316;
const ry0 = 150;
const ry1 = 362;
fillRoundRect(rx0, ry0, rx1, ry1, 16, GREEN);

// Carve the V-notch at the bottom (apex pointing up at the ribbon's vertical center)
const cx = (rx0 + rx1) / 2;
const apexY = 300;
for (let y = apexY; y <= ry1; y++) {
  const half = y - apexY;
  for (let x = cx - half; x <= cx + half; x++) px(Math.round(x), y, PANEL);
}

// ---- PNG encoding ----
function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const raw = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "command-icon.png"), png);
console.log(`Wrote assets/command-icon.png (${png.length} bytes)`);
