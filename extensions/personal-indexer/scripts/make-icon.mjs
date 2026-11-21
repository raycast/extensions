import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const width = 512;
const height = 512;
const raw = Buffer.alloc(height * (width * 4 + 1));

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const row = y * (width * 4 + 1);
  raw[row] = 0;
  const offset = row + 1 + x * 4;
  raw[offset] = r;
  raw[offset + 1] = g;
  raw[offset + 2] = b;
  raw[offset + 3] = a;
}

function fillRoundRect(x0, y0, x1, y1, radius, color) {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const dx = x < x0 + radius ? x0 + radius - x : x >= x1 - radius ? x - (x1 - radius - 1) : 0;
      const dy = y < y0 + radius ? y0 + radius - y : y >= y1 - radius ? y - (y1 - radius - 1) : 0;
      if (dx * dx + dy * dy <= radius * radius) setPixel(x, y, color[0], color[1], color[2]);
    }
  }
}

function fillCircle(cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) setPixel(x, y, color[0], color[1], color[2]);
    }
  }
}

for (let y = 0; y < height; y += 1) raw[y * (width * 4 + 1)] = 0;
fillRoundRect(0, 0, width, height, 96, [15, 23, 42]);
fillRoundRect(116, 78, 332, 434, 28, [248, 250, 252]);
for (const y of [150, 190, 230, 270]) fillRoundRect(156, y, 292, y + 16, 8, [186, 214, 232]);
fillCircle(338, 318, 78, [14, 165, 233]);
fillCircle(338, 318, 46, [248, 250, 252]);
fillRoundRect(392, 368, 452, 404, 12, [14, 165, 233]);

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([name, data])) >>> 0);
  return Buffer.concat([length, name, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

const output = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "icon.png");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, png);
console.log(output);
