import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const size = 512;

function makeCanvas() {
  return Buffer.alloc(size * size * 4);
}

function rgba(hex, alpha = 255) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
    a: alpha,
  };
}

function blendPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
  const alpha = color.a / 255;
  const inverse = 1 - alpha;
  canvas[idx] = clampByte(Math.round(color.r * alpha + canvas[idx] * inverse));
  canvas[idx + 1] = clampByte(Math.round(color.g * alpha + canvas[idx + 1] * inverse));
  canvas[idx + 2] = clampByte(Math.round(color.b * alpha + canvas[idx + 2] * inverse));
  canvas[idx + 3] = clampByte(color.a + canvas[idx + 3] * inverse);
}

function clampByte(value) {
  return Math.max(0, Math.min(255, value));
}

function fillRect(canvas, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) blendPixel(canvas, xx, yy, color);
  }
}

function fillCircle(canvas, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) blendPixel(canvas, x, y, color);
    }
  }
}

function fillPolygon(canvas, points, color) {
  const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(...points.map((point) => point.y))));

  for (let y = minY; y <= maxY; y++) {
    const intersections = [];
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      if ((current.y <= y && next.y > y) || (next.y <= y && current.y > y)) {
        const x = current.x + ((y - current.y) * (next.x - current.x)) / (next.y - current.y);
        intersections.push(x);
      }
    }

    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const startX = Math.max(0, Math.floor(intersections[i]));
      const endX = Math.min(size - 1, Math.ceil(intersections[i + 1] ?? intersections[i]));
      for (let x = startX; x <= endX; x++) blendPixel(canvas, x, y, color);
    }
  }
}

function fillRoundedRect(canvas, x, y, w, h, radius, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const dx = xx < x + radius ? x + radius - xx : xx > x + w - radius ? xx - (x + w - radius) : 0;
      const dy = yy < y + radius ? y + radius - yy : yy > y + h - radius ? yy - (y + h - radius) : 0;
      if (dx * dx + dy * dy <= radius * radius) blendPixel(canvas, xx, yy, color);
    }
  }
}

function drawLine(canvas, x1, y1, x2, y2, width, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    fillCircle(canvas, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
  }
}

function drawCropCorners(canvas, x, y, w, h, color) {
  const len = 62;
  const width = 13;
  drawLine(canvas, x, y, x + len, y, width, color);
  drawLine(canvas, x, y, x, y + len, width, color);
  drawLine(canvas, x + w, y, x + w - len, y, width, color);
  drawLine(canvas, x + w, y, x + w, y + len, width, color);
  drawLine(canvas, x, y + h, x + len, y + h, width, color);
  drawLine(canvas, x, y + h, x, y + h - len, width, color);
  drawLine(canvas, x + w, y + h, x + w - len, y + h, width, color);
  drawLine(canvas, x + w, y + h, x + w, y + h - len, width, color);
}

function drawTextStack(canvas, x, y, widths, color) {
  widths.forEach((lineWidth, index) => {
    drawLine(canvas, x, y + index * 36, x + lineWidth, y + index * 36, 14, color);
  });
}

function drawPrism(canvas) {
  const prism = [
    { x: 248, y: 134 },
    { x: 346, y: 256 },
    { x: 248, y: 378 },
  ];

  fillPolygon(canvas, prism, rgba("#f8fafc", 228));
  fillPolygon(canvas, [{ x: 252, y: 148 }, { x: 333, y: 256 }, { x: 252, y: 364 }], rgba("#0f172a", 28));
  drawLine(canvas, 248, 134, 346, 256, 7, rgba("#ffffff", 178));
  drawLine(canvas, 346, 256, 248, 378, 7, rgba("#ffffff", 118));
  drawLine(canvas, 248, 378, 248, 134, 7, rgba("#ffffff", 90));
  drawLine(canvas, 266, 178, 312, 256, 4, rgba("#14b8a6", 120));
  drawLine(canvas, 266, 334, 312, 256, 4, rgba("#f59e0b", 105));
}

function drawIcon({ screenshot = false } = {}) {
  const canvas = makeCanvas();
  const bg1 = rgba("#101820");
  const bg2 = rgba("#172033");
  const bg3 = rgba("#064e3b");
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x * 0.9 + y * 1.1) / (size * 2);
      const pulse = Math.max(0, 1 - Math.hypot(x - 364, y - 164) / 310) * 0.32;
      const r = Math.round(bg1.r * (1 - t) + bg2.r * t + bg3.r * pulse);
      const g = Math.round(bg1.g * (1 - t) + bg2.g * t + bg3.g * pulse);
      const b = Math.round(bg1.b * (1 - t) + bg2.b * t + bg3.b * pulse);
      blendPixel(canvas, x, y, { r, g, b, a: 255 });
    }
  }

  fillCircle(canvas, 342, 168, 118, rgba("#14b8a6", 18));
  fillCircle(canvas, 176, 344, 132, rgba("#f59e0b", 12));
  fillRoundedRect(canvas, 60, 92, 392, 328, 70, rgba("#000000", 44));

  drawLine(canvas, 124, 206, 244, 206, 7, rgba("#f59e0b", 92));
  drawLine(canvas, 134, 254, 250, 254, 7, rgba("#f59e0b", 108));
  drawLine(canvas, 118, 302, 244, 302, 7, rgba("#f59e0b", 92));

  drawLine(canvas, 346, 220, 420, 202, 7, rgba("#14b8a6", 116));
  drawLine(canvas, 346, 256, 430, 256, 7, rgba("#67e8f9", 150));
  drawLine(canvas, 346, 292, 420, 312, 7, rgba("#a3e635", 118));

  drawTextStack(canvas, 96, 190, [98, 126, 82], rgba("#f8fafc", 214));
  drawTextStack(canvas, 360, 186, [62, 86, 70, 48], rgba("#ccfbf1", 228));
  drawPrism(canvas);

  fillCircle(canvas, 346, 256, 8, rgba("#ffffff", 230));
  fillCircle(canvas, 346, 256, 18, rgba("#67e8f9", 42));

  if (screenshot) {
    drawCropCorners(canvas, 62, 84, 388, 344, rgba("#a3e635", 235));
  }

  return canvas;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(canvas) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rawOffset = y * (size * 4 + 1);
    raw[rawOffset] = 0;
    canvas.copy(raw, rawOffset + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([header, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("assets", { recursive: true });
writeFileSync("assets/icon.png", png(drawIcon()));
writeFileSync("assets/screenshot-translate.png", png(drawIcon({ screenshot: true })));
