import { deflateSync } from "node:zlib";
import { copyFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const publicIconPath = "assets/icon.png";
const generatedIconPath = "assets/icon.generated.png";
const overwriteMode = parseOverwriteMode(process.argv.slice(2));

const size = 512;
const scale = 4;
const width = size * scale;
const height = size * scale;
const data = new Uint8ClampedArray(width * height * 4);

function parseOverwriteMode(args) {
  if (args.length === 0) {
    return "prompt";
  }

  if (args.length === 1 && args[0] === "--yes") {
    return "yes";
  }

  if (args.length === 1 && args[0] === "--no") {
    return "no";
  }

  console.error("Usage: node scripts/generate-icon.mjs [--yes|--no]");
  console.error("--yes and --no cannot be used together. Unsupported arguments are not allowed.");
  process.exit(1);
}

function hex(hexValue, alpha = 255) {
  const value = hexValue.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function blendColor(c1, c2, t) {
  return [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t), mix(c1[3], c2[3], t)];
}

function insideRoundedRect(px, py, x, y, w, h, r) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
}

function putPixel(x, y, color) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  const srcA = color[3] / 255;
  const dstA = data[index + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);

  if (outA === 0) {
    return;
  }

  data[index] = (color[0] * srcA + data[index] * dstA * (1 - srcA)) / outA;
  data[index + 1] = (color[1] * srcA + data[index + 1] * dstA * (1 - srcA)) / outA;
  data[index + 2] = (color[2] * srcA + data[index + 2] * dstA * (1 - srcA)) / outA;
  data[index + 3] = outA * 255;
}

function fillRoundedRect(x, y, w, h, r, color) {
  const sx = Math.floor(x * scale);
  const sy = Math.floor(y * scale);
  const ex = Math.ceil((x + w) * scale);
  const ey = Math.ceil((y + h) * scale);

  for (let py = sy; py < ey; py += 1) {
    for (let px = sx; px < ex; px += 1) {
      const ux = (px + 0.5) / scale;
      const uy = (py + 0.5) / scale;
      if (insideRoundedRect(ux, uy, x, y, w, h, r)) {
        putPixel(px, py, color);
      }
    }
  }
}

function fillRotatedRoundedRect(cx, cy, w, h, r, angle, color) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pad = Math.max(w, h) * 0.22;
  const sx = Math.floor((cx - w / 2 - pad) * scale);
  const sy = Math.floor((cy - h / 2 - pad) * scale);
  const ex = Math.ceil((cx + w / 2 + pad) * scale);
  const ey = Math.ceil((cy + h / 2 + pad) * scale);

  for (let py = sy; py < ey; py += 1) {
    for (let px = sx; px < ex; px += 1) {
      const ux = (px + 0.5) / scale - cx;
      const uy = (py + 0.5) / scale - cy;
      const rx = ux * cos + uy * sin;
      const ry = -ux * sin + uy * cos;
      if (insideRoundedRect(rx, ry, -w / 2, -h / 2, w, h, r)) {
        putPixel(px, py, color);
      }
    }
  }
}

function fillBackground() {
  const coral = hex("#ff6758");
  const peach = hex("#ffc98f");
  const gold = hex("#f2c842");
  const lavender = hex("#9ea4f5");
  const rust = hex("#a86635");

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const ux = (px + 0.5) / scale;
      const uy = (py + 0.5) / scale;
      if (!insideRoundedRect(ux, uy, 0, 0, size, size, 96)) {
        continue;
      }

      const nx = ux / size;
      const ny = uy / size;
      const top = blendColor(coral, rust, nx);
      const bottom = blendColor(coral, lavender, nx);
      let color = blendColor(top, bottom, ny);
      const warm = Math.max(0, 1 - Math.hypot(nx - 0.54, ny - 0.08) * 2.2);
      color = blendColor(color, gold, warm * 0.45);
      const glow = Math.max(0, 1 - Math.hypot(nx - 0.58, ny - 0.88) * 2.1);
      color = blendColor(color, peach, glow * 0.55);
      putPixel(px, py, [color[0], color[1], color[2], 255]);
    }
  }
}

function addCard(cx, cy, w, h, angle, fill, shadowAlpha = 48) {
  fillRotatedRoundedRect(cx + 9, cy + 15, w, h, 34, angle, [64, 36, 64, shadowAlpha]);
  fillRotatedRoundedRect(cx, cy, w, h, 34, angle, fill);
}

function drawHash(x, y, color) {
  fillRoundedRect(x + 10, y, 10, 62, 5, color);
  fillRoundedRect(x + 34, y, 10, 62, 5, color);
  fillRoundedRect(x, y + 17, 58, 10, 5, color);
  fillRoundedRect(x, y + 39, 58, 10, 5, color);
}

function drawFrontCardContent() {
  drawHash(134, 125, hex("#5841c8", 255));
  fillRoundedRect(138, 204, 147, 16, 8, hex("#ff7f66", 255));
  fillRoundedRect(138, 242, 156, 14, 7, hex("#bd93d6", 235));
  fillRoundedRect(138, 278, 126, 14, 7, hex("#d7bddf", 235));
  fillRoundedRect(138, 314, 96, 14, 7, hex("#ead4d3", 235));
}

function drawClipboard() {
  fillRoundedRect(292, 239, 139, 166, 37, hex("#4a2f69", 92));
  fillRoundedRect(286, 230, 138, 168, 35, hex("#332554", 255));
  fillRoundedRect(286, 230, 138, 168, 35, hex("#000000", 0));
  fillRoundedRect(293, 237, 124, 154, 28, hex("#3b2a64", 255));
  fillRoundedRect(325, 213, 64, 44, 14, hex("#fff0d4", 255));
  fillRoundedRect(330, 217, 54, 34, 11, hex("#ffd0a6", 255));
  fillRoundedRect(323, 286, 67, 11, 6, hex("#f7d6e9", 245));
  fillRoundedRect(323, 322, 80, 11, 6, hex("#ff9f88", 245));
  fillRoundedRect(323, 358, 49, 11, 6, hex("#c4bbff", 245));
}

function downsample() {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const index = ((y * scale + sy) * width + x * scale + sx) * 4;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          a += data[index + 3];
        }
      }
      const samples = scale * scale;
      const outIndex = (y * size + x) * 4;
      out[outIndex] = Math.round(r / samples);
      out[outIndex + 1] = Math.round(g / samples);
      out[outIndex + 2] = Math.round(b / samples);
      out[outIndex + 3] = Math.round(a / samples);
    }
  }
  return out;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, payload = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, payload])));
  return Buffer.concat([length, typeBuffer, payload, checksum]);
}

function encodePng(rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND"),
  ]);
}

fillBackground();
addCard(245, 232, 228, 292, 0.14, hex("#ead8ff", 185), 34);
addCard(220, 230, 238, 304, -0.08, hex("#ffd8bd", 215), 42);
addCard(217, 225, 228, 298, 0, hex("#fff6e9", 255), 56);
drawFrontCardContent();
drawClipboard();

mkdirSync(path.dirname(generatedIconPath), { recursive: true });
writeFileSync(generatedIconPath, encodePng(downsample()));

async function askOverwrite() {
  if (overwriteMode === "yes") {
    return "yes";
  }

  if (overwriteMode === "no") {
    return "no";
  }

  if (!input.isTTY) {
    return readFileSync(0, "utf8").trim();
  }

  const readline = createInterface({ input, output });
  const answer = await readline.question(
    `Overwrite ${publicIconPath} with ${generatedIconPath}? Type "yes" to overwrite: `,
  );
  readline.close();
  return answer.trim();
}

console.log(`Generated ${generatedIconPath}.`);
console.log(`Review ${generatedIconPath} before replacing ${publicIconPath}.`);

const answer = await askOverwrite();

if (answer.toLowerCase() === "yes") {
  copyFileSync(generatedIconPath, publicIconPath);
  unlinkSync(generatedIconPath);
  console.log(`Updated ${publicIconPath} and removed ${generatedIconPath}.`);
} else {
  console.log(`Skipped. ${publicIconPath} was not changed.`);
  console.log(`Generated file remains at ${generatedIconPath}.`);
}
