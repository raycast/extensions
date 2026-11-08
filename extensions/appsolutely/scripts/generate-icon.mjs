// Reproducible vector-style icon; only Node built-ins are needed.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const size = 512;
const samples = 2;
const tiles = [];
for (let row = 0; row < 3; row++) {
  for (let column = 0; column < 3; column++) {
    tiles.push({ x: 100 + column * 112, y: 100 + row * 112, grouped: row === 2 && column === 2 });
  }
}

function rounded(x, y, left, top, width, height, radius) {
  const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
  const dy = Math.max(top + radius - y, 0, y - (top + height - radius));
  return x >= left && x <= left + width && y >= top && y <= top + height && dx * dx + dy * dy <= radius * radius;
}

function pixel(x, y) {
  if (!rounded(x, y, 24, 24, 464, 464, 106)) return [0, 0, 0, 0];
  let color = [20 + (y / size) * 6, 42 + (x / size) * 12, 63 + (y / size) * 10, 255];
  for (const tile of tiles) {
    if (rounded(x, y, tile.x, tile.y, 88, 88, 22)) {
      color = tile.grouped ? [92, 232, 199, 255] : [236, 246, 246, 255];
      if (tile.grouped) {
        for (const dx of [18, 49]) {
          for (const dy of [18, 49]) {
            if (rounded(x, y, tile.x + dx, tile.y + dy, 21, 21, 6)) color = [24, 61, 75, 255];
          }
        }
      }
    }
  }
  return color;
}

const rows = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const total = [0, 0, 0, 0];
    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const value = pixel(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples);
        for (let channel = 0; channel < 4; channel++) total[channel] += value[channel];
      }
    }
    for (let channel = 0; channel < 4; channel++)
      rows[y * (size * 4 + 1) + 1 + x * 4 + channel] = Math.round(total[channel] / samples ** 2);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
mkdirSync(new URL("../assets/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../assets/extension-icon.png", import.meta.url),
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
