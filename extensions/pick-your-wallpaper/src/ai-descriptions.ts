import { AI, environment } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import zlib from "zlib";
import { File } from "./types/file";

const execFilePromise = promisify(execFile);

export interface WallpaperDescription {
  description: string;
  tags: string;
  generatedAt: number;
}

export type DescriptionCache = Record<string, WallpaperDescription>;

export function getCachePath(): string {
  return path.join(environment.supportPath, "ai-descriptions.json");
}

export function loadDescriptionCache(): DescriptionCache {
  try {
    const data = fs.readFileSync(getCachePath(), "utf8");
    return JSON.parse(data) as DescriptionCache;
  } catch {
    return {};
  }
}

function saveDescriptionCache(cache: DescriptionCache): void {
  try {
    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving AI descriptions cache:", error);
  }
}

// ── PNG pixel extraction ──────────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Apply a PNG filter to reconstruct one row of pixel data. */
function applyPNGFilter(raw: Buffer, prev: Buffer | null, bpp: number, filter: number): Buffer {
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const a = i >= bpp ? out[i - bpp] : 0;
    const b = prev ? prev[i] : 0;
    const c = i >= bpp && prev ? prev[i - bpp] : 0;
    const x = raw[i];
    switch (filter) {
      case 0:
        out[i] = x;
        break;
      case 1:
        out[i] = (x + a) & 0xff;
        break;
      case 2:
        out[i] = (x + b) & 0xff;
        break;
      case 3:
        out[i] = (x + Math.floor((a + b) / 2)) & 0xff;
        break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        out[i] = (x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
        break;
      }
      default:
        out[i] = x;
    }
  }
  return out;
}

/** Parse a PNG buffer and return all RGB pixels. Returns [] on failure. */
function parsePNGPixels(buffer: Buffer): RGB[] {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 8 || !buffer.slice(0, 8).equals(PNG_SIG)) return [];

  let width = 0,
    height = 0,
    bitDepth = 8,
    colorType = 2;
  const idatChunks: Buffer[] = [];
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + len;
  }

  // Only handle 8-bit RGB (2) and RGBA (6)
  if (!idatChunks.length || bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) return [];

  try {
    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    const bpp = colorType === 6 ? 4 : 3;
    const rowBytes = width * bpp;
    const pixels: RGB[] = [];
    let prevRow: Buffer | null = null;

    for (let y = 0; y < height; y++) {
      const base = y * (rowBytes + 1);
      const filterByte = decompressed[base];
      const rawRow = decompressed.slice(base + 1, base + 1 + rowBytes);
      const row = applyPNGFilter(rawRow, prevRow, bpp, filterByte);
      prevRow = row;
      for (let x = 0; x < width; x++) {
        pixels.push({ r: row[x * bpp], g: row[x * bpp + 1], b: row[x * bpp + 2] });
      }
    }
    return pixels;
  } catch {
    return [];
  }
}

/** Map an RGB triplet to a human-readable color name. */
function rgbToColorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / (2 * 255);
  const saturation = max === min ? 0 : (max - min) / (lightness < 0.5 ? max + min : 510 - max - min);

  if (lightness < 0.1) return "black";
  if (lightness > 0.9) return "white";
  if (saturation < 0.15) {
    if (lightness < 0.35) return "dark gray";
    if (lightness > 0.65) return "light gray";
    return "gray";
  }

  const hue =
    max === min
      ? 0
      : max === r
      ? (((60 * ((g - b) / (max - min))) % 360) + 360) % 360
      : max === g
      ? 60 * ((b - r) / (max - min)) + 120
      : 60 * ((r - g) / (max - min)) + 240;

  const prefix = lightness < 0.38 ? "dark " : lightness > 0.68 ? "light " : "";
  if (hue < 20 || hue >= 340) return `${prefix}red`;
  if (hue < 50) return `${prefix}orange`;
  if (hue < 75) return `${prefix}yellow`;
  if (hue < 165) return `${prefix}green`;
  if (hue < 195) return `${prefix}cyan`;
  if (hue < 255) return `${prefix}blue`;
  if (hue < 290) return `${prefix}purple`;
  if (hue < 340) return `${prefix}pink`;
  return `${prefix}red`;
}

/** Quantise pixels and return the top N unique color names. */
function getDominantColors(pixels: RGB[], maxColors = 5): string[] {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (const { r, g, b } of pixels) {
    const key = `${r >> 2},${g >> 2},${b >> 2}`;
    const entry = buckets.get(key);
    if (entry) {
      entry.r += r;
      entry.g += g;
      entry.b += b;
      entry.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const result: string[] = [];
  for (const { r, g, b, count } of sorted.slice(0, 20)) {
    const name = rgbToColorName(Math.round(r / count), Math.round(g / count), Math.round(b / count));
    if (!result.includes(name)) {
      result.push(name);
      if (result.length >= maxColors) break;
    }
  }
  return result;
}

/**
 * Extract dominant color names from an image by downsampling it to a
 * 30×30 PNG thumbnail via sips (written to TMPDIR), then parsing the
 * PNG pixel data in-process using Node.js built-ins.
 */
async function extractImageColors(filePath: string): Promise<string> {
  const tmpDir = process.env.TMPDIR ?? "/tmp";
  const tmpPath = path.join(tmpDir, `raycast-colors-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  try {
    await execFilePromise("sips", ["-Z", "30", "-s", "format", "png", filePath, "--out", tmpPath]);
    const buffer = fs.readFileSync(tmpPath);
    const pixels = parsePNGPixels(buffer);
    fs.unlink(tmpPath, () => undefined);
    const colors = getDominantColors(pixels);
    return colors.length > 0 ? colors.join(", ") : "";
  } catch {
    try {
      fs.unlink(tmpPath, () => undefined);
    } catch {
      // ignore
    }
    return "";
  }
}

// ── Batch description generation ─────────────────────────────────────────────

async function generateBatch(files: File[]): Promise<DescriptionCache> {
  // Extract real color data from each image in parallel
  const colorData = await Promise.all(files.map((f) => extractImageColors(f.path)));

  const entries = files.map((f, i) => {
    const baseName = path.basename(f.name, path.extname(f.name));
    const colors = colorData[i];
    return colors ? `${i + 1}. "${baseName}" — colors: ${colors}` : `${i + 1}. "${baseName}"`;
  });

  const prompt = `You are describing desktop wallpaper images for a search system. For each entry below you are given the filename and the dominant colors extracted directly from the image pixels.

Generate a short visual description (1 sentence, ≤20 words) and 5–8 comma-separated tags describing the visual content, mood, colors, and style. Base your answer on the actual pixel colors provided, not assumptions from the filename.

Return ONLY a valid JSON array — no markdown, no extra text:
[{"name": "filename_without_extension", "description": "...", "tags": "tag1, tag2, ..."}]

Images:
${entries.join("\n")}`;

  try {
    const response = await AI.ask(prompt, { creativity: "low" });
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return {};

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ name: string; description: string; tags: string }>;
    const now = Date.now();
    const result: DescriptionCache = {};

    for (const item of parsed) {
      const matchedFile = files.find((f) => {
        const baseName = path.basename(f.name, path.extname(f.name));
        return baseName.toLowerCase() === item.name.toLowerCase();
      });
      if (matchedFile) {
        result[matchedFile.path] = {
          description: item.description,
          tags: item.tags,
          generatedAt: now,
        };
      }
    }
    return result;
  } catch (error) {
    console.error("Error generating AI descriptions batch:", error);
    return {};
  }
}

export async function getDescriptions(files: File[]): Promise<DescriptionCache> {
  if (!environment.canAccess(AI)) return {};

  const cache = loadDescriptionCache();
  const uncached = files.filter((f) => !cache[f.path]);

  if (uncached.length === 0) return cache;

  const batchSize = 20;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    const batchResult = await generateBatch(batch);
    Object.assign(cache, batchResult);
  }

  saveDescriptionCache(cache);
  return cache;
}
