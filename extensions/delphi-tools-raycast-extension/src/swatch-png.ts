import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getDefaultOutputRoot } from "./utils/preferences";
import { deflateSync } from "node:zlib";

import { hexToRgbOrThrow } from "./utils/color";

export type CreateTempSolidSwatchSvgOptions = {
  colour: string;
  namespace: string;
  width?: number;
  height?: number;
};

export type CreateTempTextSwatchPngOptions = {
  backgroundColour: string;
  foregroundColour: string;
  namespace: string;
  width?: number;
  height?: number;
};

export type CreateTempTextSwatchSvgOptions = CreateTempTextSwatchPngOptions;

const DEFAULT_SWATCH_WIDTH = 180;
const DEFAULT_SWATCH_HEIGHT = 96;
const DEFAULT_TEXT_SWATCH_WIDTH = 720;
const DEFAULT_TEXT_SWATCH_HEIGHT = 360;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const pendingSwatchWrites = new Map<string, Promise<void>>();

export async function createTempSolidSwatchSvg({
  colour,
  namespace,
  width = DEFAULT_SWATCH_WIDTH,
  height = DEFAULT_SWATCH_HEIGHT,
}: CreateTempSolidSwatchSvgOptions): Promise<string> {
  const hex = normaliseHexColour(colour);
  const filePath = getTempSwatchPath({ hex, namespace, width, height });

  await writeTempSwatch(
    filePath,
    Buffer.from(encodeSolidColourSvg({ hex, width, height }), "utf8"),
  );

  return filePath;
}

export async function createTempTextSwatchPng({
  backgroundColour,
  foregroundColour,
  namespace,
  width = DEFAULT_TEXT_SWATCH_WIDTH,
  height = DEFAULT_TEXT_SWATCH_HEIGHT,
}: CreateTempTextSwatchPngOptions): Promise<string> {
  const backgroundHex = normaliseHexColour(backgroundColour);
  const foregroundHex = normaliseHexColour(foregroundColour);
  const filePath = getTempTextSwatchPath({
    backgroundHex,
    foregroundHex,
    namespace,
    width,
    height,
  });

  await writeTempSwatch(
    filePath,
    encodeTextSwatchPng({ backgroundHex, foregroundHex, width, height }),
  );

  return filePath;
}

export async function createTempTextSwatchSvg({
  backgroundColour,
  foregroundColour,
  namespace,
  width = DEFAULT_TEXT_SWATCH_WIDTH,
  height = DEFAULT_TEXT_SWATCH_HEIGHT,
}: CreateTempTextSwatchSvgOptions): Promise<string> {
  const backgroundHex = normaliseHexColour(backgroundColour);
  const foregroundHex = normaliseHexColour(foregroundColour);
  const filePath = getTempTextSwatchPath({
    backgroundHex,
    foregroundHex,
    namespace,
    width,
    height,
    extension: "svg",
  });

  await writeTempSwatch(
    filePath,
    Buffer.from(
      encodeTextSwatchSvg({ backgroundHex, foregroundHex, width, height }),
      "utf8",
    ),
  );

  return filePath;
}

async function writeTempSwatch(
  filePath: string,
  buffer: Buffer,
): Promise<void> {
  const previousWrite = pendingSwatchWrites.get(filePath) ?? Promise.resolve();

  const currentWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, buffer);
    });

  pendingSwatchWrites.set(filePath, currentWrite);

  try {
    await currentWrite;
  } finally {
    if (pendingSwatchWrites.get(filePath) === currentWrite) {
      pendingSwatchWrites.delete(filePath);
    }
  }
}

export function normaliseHexColour(colour: string): string {
  const trimmed = colour.trim();
  const match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);

  if (!match) {
    throw new Error(`Expected a 6-digit hex color, received: ${colour}`);
  }

  return `#${match[1].toLowerCase()}`;
}

function getTempSwatchPath({
  hex,
  namespace,
  width,
  height,
}: {
  hex: string;
  namespace: string;
  width: number;
  height: number;
}): string {
  const fileSafeNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, "-");

  return path.join(
    getDefaultOutputRoot(),
    fileSafeNamespace,
    `swatch-${width}x${height}-${hex.slice(1)}.svg`,
  );
}

function getTempTextSwatchPath({
  backgroundHex,
  foregroundHex,
  namespace,
  width,
  height,
  extension = "png",
}: {
  backgroundHex: string;
  foregroundHex: string;
  namespace: string;
  width: number;
  height: number;
  extension?: "png" | "svg";
}): string {
  const fileSafeNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, "-");

  return path.join(
    getDefaultOutputRoot(),
    fileSafeNamespace,
    `text-swatch-${width}x${height}-${backgroundHex.slice(1)}-${foregroundHex.slice(1)}.${extension}`,
  );
}

function encodeSolidColourSvg({
  hex,
  width,
  height,
}: {
  hex: string;
  width: number;
  height: number;
}): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Swatch ${hex}">`,
    `  <rect width="100%" height="100%" fill="${hex}"/>`,
    "</svg>",
  ].join("\n");
}

function encodeTextSwatchPng({
  backgroundHex,
  foregroundHex,
  width,
  height,
}: {
  backgroundHex: string;
  foregroundHex: string;
  width: number;
  height: number;
}): Buffer {
  const [backgroundRed, backgroundGreen, backgroundBlue] =
    hexToRgbOrThrow(backgroundHex);
  const raw = createRawImage({
    width,
    height,
    red: backgroundRed,
    green: backgroundGreen,
    blue: backgroundBlue,
  });
  const foregroundRgb = hexToRgbOrThrow(foregroundHex);
  const x = Math.max(24, Math.round(width * 0.05));
  const y = Math.max(32, Math.round(height * 0.26));

  drawText(raw, width, x, y, "Large Text (24px+)", foregroundRgb, 6);
  drawText(
    raw,
    width,
    x,
    y + 58,
    "Normal text at 16px. The quick brown fox jumps.",
    foregroundRgb,
    4,
  );
  drawText(
    raw,
    width,
    x,
    y + 96,
    "Small text at 14px for fine print and captions.",
    foregroundRgb,
    3,
  );

  return encodeRawPng({ raw, width, height });
}

function encodeTextSwatchSvg({
  backgroundHex,
  foregroundHex,
  width,
  height,
}: {
  backgroundHex: string;
  foregroundHex: string;
  width: number;
  height: number;
}): string {
  const x = Math.max(24, Math.round(width * 0.05));
  const y = Math.max(72, Math.round(height * 0.28));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contrast preview">`,
    `  <rect width="100%" height="100%" fill="${backgroundHex}"/>`,
    `  <text x="${x}" y="${y}" fill="${foregroundHex}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="48" font-weight="700">Large Text (24px+)</text>`,
    `  <text x="${x}" y="${y + 74}" fill="${foregroundHex}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="32">Normal text at 16px. The quick brown fox jumps.</text>`,
    `  <text x="${x}" y="${y + 124}" fill="${foregroundHex}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="24">Small text at 14px for fine print and captions.</text>`,
    "</svg>",
  ].join("\n");
}

function createRawImage({
  width,
  height,
  red,
  green,
  blue,
}: {
  width: number;
  height: number;
  red: number;
  green: number;
  blue: number;
}): Buffer {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * stride;

    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const offset = rowOffset + 1 + x * 4;

      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = 255;
    }
  }

  return raw;
}

function encodeRawPng({
  raw,
  width,
  height,
}: {
  raw: Buffer;
  width: number;
  height: number;
}): Buffer {
  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    createPngChunk("IHDR", ihdr),
    createPngChunk("IDAT", deflateSync(raw)),
    createPngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function drawText(
  raw: Buffer,
  width: number,
  x: number,
  y: number,
  text: string,
  colour: [number, number, number],
  scale: number,
): void {
  let cursorX = x;

  for (const character of text.toUpperCase()) {
    const glyph = FONT[character] ?? FONT[" "];

    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] !== "1") {
          continue;
        }

        fillRect(
          raw,
          width,
          cursorX + column * scale,
          y + row * scale,
          scale,
          scale,
          colour,
        );
      }
    }

    cursorX += (glyph[0].length + 1) * scale;
  }
}

function fillRect(
  raw: Buffer,
  width: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  [red, green, blue]: [number, number, number],
): void {
  const height = raw.length / (width * 4 + 1);

  for (let row = y; row < y + rectHeight; row += 1) {
    if (row < 0 || row >= height) {
      continue;
    }

    for (let column = x; column < x + rectWidth; column += 1) {
      if (column < 0 || column >= width) {
        continue;
      }

      const offset = row * (width * 4 + 1) + 1 + column * 4;

      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = 255;
    }
  }
}

const FONT: Record<string, string[]> = {
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  "(": ["010", "100", "100", "100", "100", "100", "010"],
  ")": ["010", "001", "001", "001", "001", "001", "010"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  ".": ["000", "000", "000", "000", "000", "110", "110"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};
