import { deflateSync } from "node:zlib";

import type { ChunkGrid } from "./bitfield";
import { colorForFraction, type Appearance } from "./heatmap-svg";

interface Palette {
  background: [number, number, number, number];
  border: [number, number, number, number];
}

const DARK: Palette = {
  background: [17, 21, 28, 255],
  border: [37, 43, 54, 255],
};

const LIGHT: Palette = {
  background: [255, 255, 255, 255],
  border: [228, 231, 236, 255],
};

const CELL = 24;
const GAP = 3;
const PADDING = 20;
const RADIUS = 4;

function parseHex(color: string): [number, number, number] {
  const normalized = color.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgba(color: string): [number, number, number, number] {
  const [r, g, b] = parseHex(color);
  return [r, g, b, 255];
}

function inRoundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): boolean {
  const r = Math.min(radius, width / 2, height / 2);
  const px = x + 0.5;
  const py = y + 0.5;
  if (px < 0 || py < 0 || px >= width || py >= height) return false;
  const cx = Math.min(Math.max(px, r), width - r);
  const cy = Math.min(Math.max(py, r), height - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function fillRoundedRect(
  pixels: Uint8Array,
  canvasWidth: number,
  x0: number,
  y0: number,
  width: number,
  height: number,
  radius: number,
  color: [number, number, number, number],
): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!inRoundedRect(x, y, width, height, radius)) continue;
      const index = ((y0 + y) * canvasWidth + (x0 + x)) * 4;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = color[3];
    }
  }
}

let crcTable: Uint32Array | null = null;

function crc32(buffer: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function renderHeatmapPng(
  grid: ChunkGrid,
  appearance: Appearance,
): Buffer {
  const palette = appearance === "light" ? LIGHT : DARK;
  const width = PADDING * 2 + grid.columns * CELL + (grid.columns - 1) * GAP;
  const height = PADDING * 2 + grid.rows * CELL + (grid.rows - 1) * GAP;
  const pixels = new Uint8Array(width * height * 4);

  fillRoundedRect(pixels, width, 0, 0, width, height, 14, palette.background);
  fillRoundedRect(pixels, width, 0, 0, width, 1, 0, palette.border);
  fillRoundedRect(pixels, width, 0, height - 1, width, 1, 0, palette.border);
  fillRoundedRect(pixels, width, 0, 0, 1, height, 0, palette.border);
  fillRoundedRect(pixels, width, width - 1, 0, 1, height, 0, palette.border);

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const fraction = grid.fractions[row]?.[column] ?? 0;
      fillRoundedRect(
        pixels,
        width,
        PADDING + column * (CELL + GAP),
        PADDING + row * (CELL + GAP),
        CELL,
        CELL,
        RADIUS,
        rgba(colorForFraction(fraction, appearance)),
      );
    }
  }

  return encodePng(width, height, pixels);
}
