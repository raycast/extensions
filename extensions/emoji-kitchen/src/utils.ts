import { showToast, Toast, Clipboard, showHUD, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { EmojiMetadata, Combinations } from "./types";

const CLIPBOARD_CACHE_DIR = path.join(os.tmpdir(), "emoji-kitchen-clipboard");
const CLIPBOARD_CACHE_MAX_FILES = 200;
const CLIPBOARD_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export function getGStaticUrl(left: string, right: string, date: string) {
  const pLeft = `u${left.toLowerCase().replace(/-/g, "-u")}`;
  const pRight = `u${right.toLowerCase().replace(/-/g, "-u")}`;
  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${pLeft}/${pLeft}_${pRight}.png`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "_");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function pruneClipboardCache() {
  if (!fs.existsSync(CLIPBOARD_CACHE_DIR)) return;

  const files = fs
    .readdirSync(CLIPBOARD_CACHE_DIR)
    .map((name) => {
      const filePath = path.join(CLIPBOARD_CACHE_DIR, name);
      try {
        const stat = fs.statSync(filePath);
        return stat.isFile() ? { filePath, mtimeMs: stat.mtimeMs } : null;
      } catch {
        return null;
      }
    })
    .filter((item): item is { filePath: string; mtimeMs: number } => Boolean(item))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const now = Date.now();
  files.forEach((file, index) => {
    const isTooOld = now - file.mtimeMs > CLIPBOARD_CACHE_MAX_AGE_MS;
    const overLimit = index >= CLIPBOARD_CACHE_MAX_FILES;
    if (isTooOld || overLimit) {
      try {
        fs.unlinkSync(file.filePath);
      } catch (e) {
        console.error("Failed to prune clipboard cache file", e);
      }
    }
  });
}

export async function downloadImage(
  url: string,
  name: string,
  options?: {
    directory?: string;
    uniqueFileName?: boolean;
  },
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to download image");

  const buffer = await response.arrayBuffer();
  const directory = options?.directory ?? os.tmpdir();
  ensureDir(directory);

  const safeName = sanitizeFileName(name);
  const fileName = options?.uniqueFileName
    ? `${safeName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`
    : `${safeName}.png`;
  const tempFile = path.join(directory, fileName);

  fs.writeFileSync(tempFile, new Uint8Array(buffer));
  return tempFile;
}

export async function copyImageToClipboard(url: string, name: string) {
  const toast = await showToast({
    title: "Copying image...",
    style: Toast.Style.Animated,
  });

  try {
    // Keep clipboard files around briefly; some macOS paste targets read file data lazily.
    const tempFile = await downloadImage(url, name, {
      directory: CLIPBOARD_CACHE_DIR,
      uniqueFileName: true,
    });
    await Clipboard.copy({ file: tempFile });
    await showHUD("Image copied to clipboard");
    toast.hide();
  } catch (error) {
    toast.title = "Failed to copy image";
    toast.message = String(error);
    toast.style = Toast.Style.Failure;
  } finally {
    try {
      pruneClipboardCache();
    } catch (e) {
      console.error("Failed to prune clipboard cache", e);
    }
  }
}

export async function saveImageToDownloads(url: string, name: string) {
  const toast = await showToast({
    title: "Saving to Downloads...",
    style: Toast.Style.Animated,
  });

  try {
    const downloadPath = path.join(os.homedir(), "Downloads", `${sanitizeFileName(name)}.png`);
    await downloadImage(url, name, {
      directory: path.dirname(downloadPath),
      uniqueFileName: false,
    });
    await showHUD(`Saved to Downloads: ${path.basename(downloadPath)}`);
    toast.hide();
  } catch (error) {
    toast.title = "Failed to save image";
    toast.message = String(error);
    toast.style = Toast.Style.Failure;
  }
}

let _cachedIndex: Record<string, EmojiMetadata> | null = null;
let _cachedVectors: Record<string, number[]> | null = null;

export const VECTOR_DIMENSION = 128;

export function loadEmojiIndex(): Record<string, EmojiMetadata> {
  if (_cachedIndex) return _cachedIndex;
  const dataPath = path.join(environment.assetsPath, "index.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  _cachedIndex = JSON.parse(rawData);
  return _cachedIndex!;
}

export function loadEmojiVectors(): Record<string, number[]> {
  if (_cachedVectors) return _cachedVectors;
  const dataPath = path.join(environment.assetsPath, "vectors.json");
  if (!fs.existsSync(dataPath)) return {};
  const rawData = fs.readFileSync(dataPath, "utf-8");
  _cachedVectors = JSON.parse(rawData);
  return _cachedVectors!;
}

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getQueryVector(text: string): Float32Array {
  const vector = new Float32Array(VECTOR_DIMENSION);
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    const idx = hashString(token) % VECTOR_DIMENSION;
    vector[idx] += 1;
  }

  let norm = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

export function cosineSimilarity(v1: Float32Array | number[], v2: Float32Array | number[]): number {
  let dot = 0;
  let norm2 = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    dot += v1[i] * v2[i];
    norm2 += v2[i] * v2[i];
  }
  // v1 (query vector) is always normalised to unit length by getQueryVector,
  // so true cosine similarity = dot / (1 * ||v2||)
  return norm2 > 0 ? dot / Math.sqrt(norm2) : 0;
}

/** Name/keyword boosts apply even when an emoji has no embedding (missing from vectors.json). */
export function scoreEmojiSearchMatch(
  meta: { a: string; k: string[] },
  unicode: string,
  queryLower: string,
  queryVec: Float32Array,
  vectors: Record<string, number[]>,
): number {
  const vec = vectors[unicode];
  let score = vec ? cosineSimilarity(queryVec, vec) : 0;

  if (meta.a.toLowerCase() === queryLower) score += 0.5;
  else if (meta.a.toLowerCase().includes(queryLower)) score += 0.2;
  else if (meta.k.some((k) => k === queryLower)) score += 0.15;
  else if (meta.k.some((k) => k.includes(queryLower))) score += 0.05;

  return score;
}

export function formatEmojiName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function loadCombinations(unicode: string): Combinations {
  try {
    const prefix = unicode.slice(0, 2);
    const dataPath = path.join(environment.assetsPath, "combinations", `${prefix}.json`);
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const group = JSON.parse(rawData);
    return group[unicode] || {};
  } catch (e) {
    console.error(`Failed to load combinations for ${unicode}`, e);
    return {};
  }
}
