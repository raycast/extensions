// 生成 Raycast 扩展图标（512x512 PNG），仅用 Node 内置模块
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const S = 512;
const px = new Uint8Array(S * S * 4);

const inRounded = (x, y, r) => {
  const min = r, max = S - r;
  if (x >= min && x <= max) return true;
  if (y >= min && y <= max) return true;
  const cx = x < min ? min : max;
  const cy = y < min ? min : max;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

// 蓝紫渐变圆角背景
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const t = (x + y) / (2 * S);
    const bg = [59 + t * 80, 130 + t * 40, 246 - t * 20, 255];
    if (inRounded(x + 0.5, y + 0.5, 96)) px.set(bg, i);
    else px.set([0, 0, 0, 0], i);
  }
}

// 画一个终端提示符 ">_"（白色矩形拼图）
const paint = (bx, by, w, h) => {
  for (let y = by; y < by + h; y++)
    for (let x = bx; x < bx + w; x++) px.set([255, 255, 255, 255], (y * S + x) * 4);
};
const stroke = 30, ox = 127, oy = 136;
// ">" 两笔
for (let k = 0; k < 90; k++) {
  paint(ox + k, oy + k, stroke, stroke + 2);
  paint(ox + k, oy + 211 - k, stroke, stroke + 2);
}
// "_"
paint(ox + 15, oy + 256, 166, stroke);

// PNG 编码
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA
const raw = Buffer.alloc(S * (S * 4 + 1), 0);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0; // filter none
  Buffer.from(px.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("../assets/icon.png", import.meta.url), png);
console.log("icon.png generated:", png.length, "bytes");
