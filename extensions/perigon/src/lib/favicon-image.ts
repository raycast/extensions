import { deflateSync, inflateSync } from "zlib";

export type FaviconAppearance = "light" | "dark";

export interface Raster {
  width: number;
  height: number;
  pixels: Uint8Array;
}

const ICON_SIZE = 64;
const STROKE_WIDTH = 8;
const HAIRLINE_WIDTH = 3;
const STACK_OVERLAP = 22;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodePng(bytes: Uint8Array): Raster {
  const input = Buffer.from(bytes);
  if (input.length < 8 || !input.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Favicon is not a PNG.");
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let palette: Uint8Array | undefined;
  let transparency: Uint8Array | undefined;
  const idat: Buffer[] = [];
  let offset = 8;

  while (offset + 8 <= input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > input.length) {
      throw new Error("Favicon PNG is truncated.");
    }
    const data = input.subarray(start, end);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? -1;
      if (data[12] !== 0) {
        throw new Error("Interlaced favicons are not supported.");
      }
    } else if (type === "PLTE") {
      palette = Uint8Array.from(data);
    } else if (type === "tRNS") {
      transparency = Uint8Array.from(data);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }

  if (width < 1 || height < 1 || idat.length === 0) {
    throw new Error("Favicon PNG is missing image data.");
  }

  const bitsPerPixel = bitsPerPixelFor(colorType, bitDepth);
  const rowBytes = Math.ceil((width * bitsPerPixel) / 8);
  const bytesPerPixel = Math.max(1, Math.floor(bitsPerPixel / 8));
  const inflated = inflateSync(Buffer.concat(idat));
  const expected = height * (rowBytes + 1);
  if (inflated.length < expected) {
    throw new Error("Favicon PNG rows are incomplete.");
  }
  const rows = unfilter(inflated, height, rowBytes, bytesPerPixel);
  return {
    width,
    height,
    pixels: toRgba(rows, width, height, rowBytes, bitDepth, colorType, palette, transparency),
  };
}

export function encodePng(raster: Raster): Buffer {
  const stride = raster.width * 4;
  const raw = Buffer.alloc(raster.height * (stride + 1));
  for (let y = 0; y < raster.height; y++) {
    const rawStart = y * (stride + 1);
    raw[rawStart] = 0;
    Buffer.from(raster.pixels.buffer, raster.pixels.byteOffset + y * stride, stride).copy(raw, rawStart + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(raster.width, 0);
  header.writeUInt32BE(raster.height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function renderCircularFavicon(source: Raster, appearance: FaviconAppearance): Raster {
  const pixels = new Uint8Array(ICON_SIZE * ICON_SIZE * 4);
  const center = ICON_SIZE / 2;
  const outer = center - 0.25;
  const photoRadius = outer - STROKE_WIDTH;
  const hairlineRadius = outer - HAIRLINE_WIDTH;
  const gap = appearance === "dark" ? [32, 32, 36] : [255, 255, 255];
  const hairline = appearance === "dark" ? [245, 245, 247] : [72, 72, 78];

  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.hypot(dx, dy);
      const outerCoverage = clamp(outer - distance + 0.5, 0, 1);
      if (outerCoverage <= 0) {
        continue;
      }
      const photoCoverage = clamp(photoRadius - distance + 0.5, 0, 1);
      const gapCoverage = clamp(hairlineRadius - distance + 0.5, 0, 1) - photoCoverage;
      const hairlineCoverage = outerCoverage - photoCoverage - gapCoverage;
      const color = sampleOverWhite(source, dx / photoRadius, dy / photoRadius);
      const index = (y * ICON_SIZE + x) * 4;
      pixels[index] = mixCoverage(
        color[0],
        photoCoverage,
        gap[0],
        gapCoverage,
        hairline[0],
        hairlineCoverage,
        outerCoverage,
      );
      pixels[index + 1] = mixCoverage(
        color[1],
        photoCoverage,
        gap[1],
        gapCoverage,
        hairline[1],
        hairlineCoverage,
        outerCoverage,
      );
      pixels[index + 2] = mixCoverage(
        color[2],
        photoCoverage,
        gap[2],
        gapCoverage,
        hairline[2],
        hairlineCoverage,
        outerCoverage,
      );
      pixels[index + 3] = Math.round(outerCoverage * 255);
    }
  }

  return { width: ICON_SIZE, height: ICON_SIZE, pixels };
}

export function renderFaviconStack(sources: Raster[], appearance: FaviconAppearance): Raster {
  const icons = sources.map((source) => renderCircularFavicon(source, appearance));
  const step = ICON_SIZE - STACK_OVERLAP;
  const width = ICON_SIZE + Math.max(0, icons.length - 1) * step;
  const pixels = new Uint8Array(width * ICON_SIZE * 4);
  icons.forEach((icon, index) => {
    blit(pixels, width, icon, index * step);
  });
  return { width, height: ICON_SIZE, pixels };
}

function bitsPerPixelFor(colorType: number, bitDepth: number): number {
  switch (colorType) {
    case 0:
      return bitDepth;
    case 2:
      return bitDepth * 3;
    case 3:
      return bitDepth;
    case 4:
      return bitDepth * 2;
    case 6:
      return bitDepth * 4;
    default:
      throw new Error(`Unsupported favicon color type ${colorType}.`);
  }
}

function unfilter(inflated: Buffer, height: number, rowBytes: number, bytesPerPixel: number): Buffer {
  const rows = Buffer.alloc(height * rowBytes);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[offset] ?? 0;
    offset += 1;
    const rowStart = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = inflated[offset + x] ?? 0;
      const left = x >= bytesPerPixel ? (rows[rowStart + x - bytesPerPixel] ?? 0) : 0;
      const up = y > 0 ? (rows[rowStart - rowBytes + x] ?? 0) : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? (rows[rowStart - rowBytes + x - bytesPerPixel] ?? 0) : 0;
      let value = raw;
      if (filter === 1) {
        value = raw + left;
      } else if (filter === 2) {
        value = raw + up;
      } else if (filter === 3) {
        value = raw + Math.floor((left + up) / 2);
      } else if (filter === 4) {
        value = raw + paeth(left, up, upLeft);
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter ${filter}.`);
      }
      rows[rowStart + x] = value & 0xff;
    }
    offset += rowBytes;
  }
  return rows;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }
  return upDistance <= upLeftDistance ? up : upLeft;
}

function toRgba(
  rows: Buffer,
  width: number,
  height: number,
  rowBytes: number,
  bitDepth: number,
  colorType: number,
  palette: Uint8Array | undefined,
  transparency: Uint8Array | undefined,
): Uint8Array {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const color = readPixel(rows, rowStart, x, bitDepth, colorType, palette, transparency);
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = color[3];
    }
  }
  return pixels;
}

function readPixel(
  rows: Buffer,
  rowStart: number,
  x: number,
  bitDepth: number,
  colorType: number,
  palette: Uint8Array | undefined,
  transparency: Uint8Array | undefined,
): [number, number, number, number] {
  if (colorType === 0 || colorType === 3) {
    const sample = readSample(rows, rowStart, x, bitDepth);
    if (colorType === 0) {
      const transparentSample =
        transparency && transparency.length >= 2 ? ((transparency[0] ?? 0) << 8) | (transparency[1] ?? 0) : undefined;
      const transparent = transparentSample !== undefined && sample === transparentSample;
      const gray = bitDepth === 8 ? sample : Math.round((sample * 255) / ((1 << bitDepth) - 1));
      return [gray, gray, gray, transparent ? 0 : 255];
    }
    if (!palette) {
      throw new Error("Favicon palette is missing.");
    }
    const offset = sample * 3;
    const alpha = transparency && sample < transparency.length ? (transparency[sample] ?? 255) : 255;
    return [palette[offset] ?? 0, palette[offset + 1] ?? 0, palette[offset + 2] ?? 0, alpha];
  }
  if (bitDepth !== 8) {
    throw new Error(`Unsupported favicon bit depth ${bitDepth}.`);
  }
  if (colorType === 4) {
    const offset = rowStart + x * 2;
    const gray = rows[offset] ?? 0;
    return [gray, gray, gray, rows[offset + 1] ?? 255];
  }
  if (colorType === 2) {
    const offset = rowStart + x * 3;
    const red = rows[offset] ?? 0;
    const green = rows[offset + 1] ?? 0;
    const blue = rows[offset + 2] ?? 0;
    const transparent =
      transparency &&
      transparency.length >= 6 &&
      red === (transparency[1] ?? -1) &&
      green === (transparency[3] ?? -1) &&
      blue === (transparency[5] ?? -1);
    return [red, green, blue, transparent ? 0 : 255];
  }
  const offset = rowStart + x * 4;
  return [rows[offset] ?? 0, rows[offset + 1] ?? 0, rows[offset + 2] ?? 0, rows[offset + 3] ?? 255];
}

function readSample(rows: Buffer, rowStart: number, x: number, bitDepth: number): number {
  if (bitDepth === 8) {
    return rows[rowStart + x] ?? 0;
  }
  if (bitDepth !== 1 && bitDepth !== 2 && bitDepth !== 4) {
    throw new Error(`Unsupported favicon bit depth ${bitDepth}.`);
  }
  const bitIndex = x * bitDepth;
  const byte = rows[rowStart + Math.floor(bitIndex / 8)] ?? 0;
  const shift = 8 - bitDepth - (bitIndex % 8);
  return (byte >> shift) & ((1 << bitDepth) - 1);
}

function sampleOverWhite(source: Raster, nx: number, ny: number): [number, number, number] {
  const x = clamp((nx * 0.5 + 0.5) * (source.width - 1), 0, source.width - 1);
  const y = clamp((ny * 0.5 + 0.5) * (source.height - 1), 0, source.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, source.width - 1);
  const y1 = Math.min(y0 + 1, source.height - 1);
  const tx = x - x0;
  const ty = y - y0;
  const top = mixPixel(pixel(source, x0, y0), pixel(source, x1, y0), tx);
  const bottom = mixPixel(pixel(source, x0, y1), pixel(source, x1, y1), tx);
  const mixed = mixPixel(top, bottom, ty);
  const alpha = mixed[3] / 255;
  return [
    mixed[0] * alpha + 255 * (1 - alpha),
    mixed[1] * alpha + 255 * (1 - alpha),
    mixed[2] * alpha + 255 * (1 - alpha),
  ];
}

function pixel(source: Raster, x: number, y: number): [number, number, number, number] {
  const index = (y * source.width + x) * 4;
  return [
    source.pixels[index] ?? 0,
    source.pixels[index + 1] ?? 0,
    source.pixels[index + 2] ?? 0,
    source.pixels[index + 3] ?? 0,
  ];
}

function mixPixel(
  start: [number, number, number, number],
  end: [number, number, number, number],
  amount: number,
): [number, number, number, number] {
  const inverse = 1 - amount;
  return [
    start[0] * inverse + end[0] * amount,
    start[1] * inverse + end[1] * amount,
    start[2] * inverse + end[2] * amount,
    start[3] * inverse + end[3] * amount,
  ];
}

function blit(destination: Uint8Array, destinationWidth: number, source: Raster, originX: number): void {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const sourceIndex = (y * source.width + x) * 4;
      const sourceAlpha = (source.pixels[sourceIndex + 3] ?? 0) / 255;
      if (sourceAlpha <= 0) {
        continue;
      }
      const destIndex = (y * destinationWidth + originX + x) * 4;
      const destAlpha = (destination[destIndex + 3] ?? 0) / 255;
      const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);
      destination[destIndex] = blendChannel(
        source.pixels[sourceIndex] ?? 0,
        sourceAlpha,
        destination[destIndex] ?? 0,
        destAlpha,
        outAlpha,
      );
      destination[destIndex + 1] = blendChannel(
        source.pixels[sourceIndex + 1] ?? 0,
        sourceAlpha,
        destination[destIndex + 1] ?? 0,
        destAlpha,
        outAlpha,
      );
      destination[destIndex + 2] = blendChannel(
        source.pixels[sourceIndex + 2] ?? 0,
        sourceAlpha,
        destination[destIndex + 2] ?? 0,
        destAlpha,
        outAlpha,
      );
      destination[destIndex + 3] = Math.round(outAlpha * 255);
    }
  }
}

function blendChannel(
  source: number,
  sourceAlpha: number,
  destination: number,
  destinationAlpha: number,
  outAlpha: number,
): number {
  if (outAlpha <= 0) {
    return 0;
  }
  return Math.round((source * sourceAlpha + destination * destinationAlpha * (1 - sourceAlpha)) / outAlpha);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])) >>> 0, 0);
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function mixCoverage(
  photo: number,
  photoCoverage: number,
  gap: number,
  gapCoverage: number,
  hairline: number,
  hairlineCoverage: number,
  outerCoverage: number,
): number {
  return Math.round((photo * photoCoverage + gap * gapCoverage + hairline * hairlineCoverage) / outerCoverage);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
