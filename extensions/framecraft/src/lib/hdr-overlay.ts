import fs from "node:fs";
import path from "node:path";
import { runCommand } from "./command-runner";

interface OverlayInput {
  path: string;
  y: number;
}

interface CompositeOptions {
  ffmpegPath: string;
  env: NodeJS.ProcessEnv;
  backgroundPath: string;
  outputPath: string;
  width: number;
  height: number;
  barPad: number;
  isPq: boolean;
  overlays: OverlayInput[];
  colorPrimaries?: string;
  colorTransfer?: string;
  colorSpace?: string;
}

const MAX = 65535;
const M1 = 2610 / 16384;
const M2 = 2523 / 32;
const C1 = 3424 / 4096;
const C2 = 2413 / 128;
const C3 = 2392 / 128;

// ST 2084 is absolute: a linear value of 1 here is 10,000 cd/m².
function encodePq(linear: number): number {
  const p = Math.pow(Math.max(0, Math.min(1, linear)), M1);
  return Math.round(MAX * Math.pow((C1 + C2 * p) / (1 + C3 * p), M2));
}

function decodePq(code: number): number {
  const p = Math.pow(code / MAX, 1 / M2);
  return Math.pow(Math.max(p - C1, 0) / (C2 - C3 * p), 1 / M1);
}

// PNG cICP uses H.273 identifiers: BT.2020 primaries, PQ transfer, RGB matrix,
// full range. FFmpeg's PNG encoder does not reliably emit this from output flags.
function tagPqPng(filename: string): void {
  const png = fs.readFileSync(filename);
  const chunk = Buffer.from([0, 0, 0, 4, 99, 73, 67, 80, 9, 16, 0, 1, 0, 0, 0, 0]);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 12)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 12);
  const parts = [png.subarray(0, 8)];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset) + 12;
    const type = png.toString("ascii", offset + 4, offset + 8);
    // Remove incompatible SDR profiles and any pre-existing cICP declaration.
    if (!["cICP", "iCCP", "sRGB", "gAMA", "cHRM"].includes(type)) {
      parts.push(png.subarray(offset, offset + length));
    }
    if (type === "IHDR") parts.push(chunk);
    offset += length;
  }
  fs.writeFileSync(filename, Buffer.concat(parts));
}

export function pngSize(filename: string): { width: number; height: number; bitDepth: number } {
  const header = Buffer.alloc(25);
  const fd = fs.openSync(filename, "r");
  try {
    if (
      fs.readSync(fd, header, 0, header.length, 0) !== header.length ||
      header.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      header.toString("ascii", 12, 16) !== "IHDR"
    ) {
      throw new Error(`Invalid PNG overlay: ${path.basename(filename)}`);
    }
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20), bitDepth: header[24] };
  } finally {
    fs.closeSync(fd);
  }
}

/** Decode/encode only with FFmpeg; all blending uses straight alpha and 16-bit RGB.
 * SDR assets are interpreted as sRGB/Rec.709; PQ output uses Rec.2020, 203-nit white.
 * Alpha-zero samples bypass every transfer function, preserving the background exactly.
 */
export async function compositeCapturePng(options: CompositeOptions): Promise<void> {
  const { ffmpegPath, env, width, height, barPad, isPq } = options;
  const outputDir = path.dirname(options.outputPath);
  const largestOverlayBytes = options.overlays.reduce((largest, overlay) => {
    const size = pngSize(overlay.path);
    return Math.max(largest, size.width * size.height * 8);
  }, 0);
  // Raw background + one RGBA overlay + conservative PNG encoding headroom.
  const requiredBytes = width * (height + barPad * 2) * 12 + largestOverlayBytes + 32 * 1024 * 1024;
  const space = fs.statfsSync(outputDir);
  if (space.bavail * space.bsize < requiredBytes) throw new Error("Insufficient free space for subtitle compositing");
  const tempDir = fs.mkdtempSync(path.join(outputDir, ".framecraft-overlay-"));
  const run = (args: string[]) =>
    runCommand(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], { env, timeout: 30_000 });
  try {
    const backgroundRaw = path.join(tempDir, "background.rgb");
    await run(["-i", options.backgroundPath, "-frames:v", "1", "-pix_fmt", "rgb48le", "-f", "rawvideo", backgroundRaw]);
    const background = fs.readFileSync(backgroundRaw);
    if (background.length !== width * height * 6) throw new Error("Background PNG dimensions do not match capture");
    const totalHeight = height + barPad * 2;
    const result = Buffer.alloc(width * totalHeight * 6);
    background.copy(result, barPad * width * 6);

    const pq = isPq ? Float64Array.from({ length: MAX + 1 }, (_, code) => decodePq(code)) : undefined;
    const srgb = isPq
      ? Float64Array.from({ length: MAX + 1 }, (_, code) => {
          const v = code / MAX;
          return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        })
      : undefined;

    for (const overlay of options.overlays) {
      const size = pngSize(overlay.path);
      const overlayRaw = path.join(tempDir, "overlay.rgba");
      const eightBit = size.bitDepth <= 8;
      await run([
        "-i",
        overlay.path,
        "-frames:v",
        "1",
        "-pix_fmt",
        eightBit ? "rgba" : "rgba64le",
        "-f",
        "rawvideo",
        overlayRaw,
      ]);
      const decoded = fs.readFileSync(overlayRaw);
      const pixels = eightBit ? Buffer.alloc(decoded.length * 2) : decoded;
      if (eightBit) {
        for (let i = 0; i < decoded.length; i++) pixels.writeUInt16LE(decoded[i] * 257, i * 2);
      }
      if (pixels.length !== size.width * size.height * 8) throw new Error("Invalid decoded overlay size");
      // PGS is palette-based; avoid repeated matrix operations for each covered pixel.
      const palette = new Map<number, number[]>();
      const offsetY = Math.round(overlay.y);
      for (let y = Math.max(0, -offsetY); y < Math.min(size.height, totalHeight - offsetY); y++) {
        for (let x = 0; x < Math.min(width, size.width); x++) {
          const src = (y * size.width + x) * 8;
          const alphaCode = pixels.readUInt16LE(src + 6);
          if (alphaCode === 0) continue;
          const dst = ((y + offsetY) * width + x) * 6;
          const alpha = alphaCode / MAX;
          const r = pixels.readUInt16LE(src);
          const g = pixels.readUInt16LE(src + 2);
          const b = pixels.readUInt16LE(src + 4);
          if (pq && srgb) {
            const key = r * 4294967296 + g * 65536 + b;
            let linear = palette.get(key);
            if (!linear) {
              const lr = srgb[r],
                lg = srgb[g],
                lb = srgb[b];
              // D65 Rec.709 -> D65 Rec.2020 in linear light (no adaptation required).
              linear = [
                (0.6274038959 * lr + 0.3292830384 * lg + 0.0433130657 * lb) * 0.0203,
                (0.0690972894 * lr + 0.9195403951 * lg + 0.0113623156 * lb) * 0.0203,
                (0.0163914389 * lr + 0.0880133079 * lg + 0.8955952532 * lb) * 0.0203,
              ];
              palette.set(key, linear);
            }
            for (let channel = 0; channel < 3; channel++) {
              const at = dst + channel * 2;
              const mixed =
                alpha === 1 ? linear[channel] : linear[channel] * alpha + pq[result.readUInt16LE(at)] * (1 - alpha);
              result.writeUInt16LE(encodePq(mixed), at);
            }
          } else {
            // Keep SDR source code values and conventional SDR alpha blending.
            for (let channel = 0; channel < 3; channel++) {
              const at = dst + channel * 2;
              result.writeUInt16LE(
                Math.round(pixels.readUInt16LE(src + channel * 2) * alpha + result.readUInt16LE(at) * (1 - alpha)),
                at,
              );
            }
          }
        }
      }
    }
    fs.writeFileSync(backgroundRaw, result);
    const tags: string[] = [];
    for (const [flag, value] of [
      ["-color_primaries", options.colorPrimaries],
      ["-color_trc", options.colorTransfer],
      ["-colorspace", options.colorSpace],
    ]) {
      if (value && value !== "unknown") tags.push(flag!, value);
    }
    await run([
      "-f",
      "rawvideo",
      "-pixel_format",
      "rgb48le",
      "-video_size",
      `${width}x${totalHeight}`,
      "-i",
      backgroundRaw,
      "-frames:v",
      "1",
      "-pix_fmt",
      "rgb48be",
      ...tags,
      options.outputPath,
    ]);
    if (isPq) tagPqPng(options.outputPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
