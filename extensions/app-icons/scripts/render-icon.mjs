import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const size = 512;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icon.png');
const bg = [10, 83, 64, 255];
const cream = [247, 242, 232, 255];
const gold = [232, 176, 47, 255];
const pixels = new Uint8ClampedArray(size * size * 4);

for (let index = 0; index < pixels.length; index += 4) {
  pixels[index] = bg[0];
  pixels[index + 1] = bg[1];
  pixels[index + 2] = bg[2];
  pixels[index + 3] = bg[3];
}

const margin = Math.round(size * 0.16);
const gap = Math.round(size * 0.07);
const tile = Math.floor((size - margin * 2 - gap) / 2);
const origin = Math.floor((size - (tile * 2 + gap)) / 2);
const radius = Math.round(tile * 0.28);
const tiles = [
  [0, 0, cream],
  [1, 0, cream],
  [0, 1, cream],
  [1, 1, gold],
];

for (const [col, row, color] of tiles) {
  fillRoundRect(origin + col * (tile + gap), origin + row * (tile + gap), tile, radius, color);
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePng(pixels));

function fillRoundRect(x, y, width, radius, color) {
  const r = Math.min(radius, Math.floor(width / 2));
  for (let py = Math.floor(y); py < Math.ceil(y + width); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(x + width); px += 1) {
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      let hits = 0;
      for (const ox of [0.25, 0.75]) {
        for (const oy of [0.25, 0.75]) {
          if (inside(px + ox, py + oy, x, y, width, r)) hits += 1;
        }
      }
      if (hits === 0) continue;
      const amount = hits / 4;
      const index = (py * size + px) * 4;
      pixels[index] = Math.round(pixels[index] + (color[0] - pixels[index]) * amount);
      pixels[index + 1] = Math.round(pixels[index + 1] + (color[1] - pixels[index + 1]) * amount);
      pixels[index + 2] = Math.round(pixels[index + 2] + (color[2] - pixels[index + 2]) * amount);
      pixels[index + 3] = 255;
    }
  }
}

function inside(px, py, x, y, width, radius) {
  const cx = Math.min(Math.max(px, x + radius), x + width - radius);
  const cy = Math.min(Math.max(py, y + radius), y + width - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function encodePng(rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * size * 4, size * 4).copy(raw, row + 1);
  }
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index] ?? 0;
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
