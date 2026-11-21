import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 512;
const H = 512;
const raw = Buffer.alloc(H * (1 + W * 4));

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = y * (1 + W * 4) + 1 + x * 4;
  raw[idx] = r;
  raw[idx + 1] = g;
  raw[idx + 2] = b;
  raw[idx + 3] = a;
}

function inRoundedRect(x, y, x0, y0, w, h, rad) {
  if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false;
  const rx = Math.max(x0 + rad - x, 0, x - (x0 + w - rad));
  const ry = Math.max(y0 + rad - y, 0, y - (y0 + h - rad));
  return rx * rx + ry * ry <= rad * rad;
}

for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  for (let x = 0; x < W; x++) {
    // Background rounded squircle (#18181B)
    if (inRoundedRect(x, y, 16, 16, 480, 480, 108)) {
      setPixel(x, y, 24, 24, 27, 255);
    }
    // Mug handle (#F59E0B)
    const outerHandle = inRoundedRect(x, y, 316, 200, 92, 148, 42);
    const innerHandle = inRoundedRect(x, y, 316, 232, 60, 84, 24);
    if (outerHandle && !innerHandle) {
      setPixel(x, y, 245, 158, 11, 255);
    }
    // Mug body (#F59E0B -> #D97706 gradient)
    if (inRoundedRect(x, y, 132, 168, 204, 224, 32)) {
      const t = (y - 168) / 224;
      setPixel(x, y, Math.round(251 - t * 34), Math.round(191 - t * 72), Math.round(36 - t * 30), 255);
    }
    // Foam top (#FFFBEB)
    if (inRoundedRect(x, y, 124, 128, 220, 62, 30)) {
      setPixel(x, y, 255, 251, 235, 255);
    }
  }
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/extension-icon.png", png);
console.log("Generated assets/extension-icon.png (512x512)");
