import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const size = 512;
const channels = 4;
const data = Buffer.alloc((size * channels + 1) * size);

function setPixel(row, col, r, g, b, a = 255) {
  const index = row * (size * channels + 1) + 1 + col * channels;
  data[index] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = a;
}

for (let y = 0; y < size; y += 1) {
  const rowStart = y * (size * channels + 1);
  data[rowStart] = 0;
  for (let x = 0; x < size; x += 1) {
    const t = y / (size - 1);
    const r = Math.round(28 + 18 * (1 - t));
    const g = Math.round(140 + 92 * (1 - t));
    const b = Math.round(172 + 52 * t);
    setPixel(y, x, r, g, b);
  }
}

const cx = 256;
const cy = 256;
for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 188 && distance < 216) {
      setPixel(y, x, 255, 255, 255, 238);
    }
    if (distance > 98 && distance < 122 && y < 292) {
      setPixel(y, x, 255, 255, 255, 238);
    }
  }
}

for (let y = 156; y < 358; y += 1) {
  for (let x = 232; x < 280; x += 1) {
    const cap = Math.abs(x - 256);
    if (y > 176 || cap < (y - 156) * 1.2) {
      setPixel(y, x, 255, 255, 255, 248);
    }
  }
}

for (let y = 332; y < 382; y += 1) {
  const halfWidth = Math.max(0, 72 - Math.abs(y - 356) * 1.4);
  for (let x = Math.round(256 - halfWidth); x < Math.round(256 + halfWidth); x += 1) {
    setPixel(y, x, 255, 255, 255, 245);
  }
}

function chunk(type, payload) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const crcInput = Buffer.concat([typeBuffer, payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBuffer, payload, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(data, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(new URL("../assets/icon.png", import.meta.url), png);
