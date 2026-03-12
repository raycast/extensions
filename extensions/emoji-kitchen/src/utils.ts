import {
  showToast,
  Toast,
  Clipboard,
  showHUD,
  environment,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { EmojiMetadata, Combinations } from "./types";

export function getGStaticUrl(left: string, right: string, date: string) {
  const pLeft = `u${left.toLowerCase().replace(/-/g, "-u")}`;
  const pRight = `u${right.toLowerCase().replace(/-/g, "-u")}`;
  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${pLeft}/${pLeft}_${pRight}.png`;
}

export async function downloadImage(
  url: string,
  name: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to download image");

  const buffer = await response.arrayBuffer();
  const tempFile = path.join(
    os.tmpdir(),
    `${name.replace(/[^a-z0-9]/gi, "_")}.png`,
  );

  fs.writeFileSync(tempFile, new Uint8Array(buffer));
  return tempFile;
}

export async function copyImageToClipboard(url: string, name: string) {
  const toast = await showToast({
    title: "Copying image...",
    style: Toast.Style.Animated,
  });

  try {
    const tempFile = await downloadImage(url, name);
    await Clipboard.copy({ file: tempFile });

    // Small delay to ensure the clipboard system has registered the file reference
    // before we delete the physical file from the temp directory.
    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }, 1000);

    await showHUD("Image copied to clipboard");
    toast.hide();
  } catch (error) {
    toast.title = "Failed to copy image";
    toast.message = String(error);
    toast.style = Toast.Style.Failure;
  }
}

export async function saveImageToDownloads(url: string, name: string) {
  const toast = await showToast({
    title: "Saving to Downloads...",
    style: Toast.Style.Animated,
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download image");

    const buffer = await response.arrayBuffer();
    const downloadPath = path.join(
      os.homedir(),
      "Downloads",
      `${name.replace(/[^a-z0-9]/gi, "_")}.png`,
    );

    fs.writeFileSync(downloadPath, new Uint8Array(buffer));
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

export function cosineSimilarity(
  v1: Float32Array | number[],
  v2: Float32Array | number[],
): number {
  let dot = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    dot += v1[i] * v2[i];
  }
  return dot;
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
    const dataPath = path.join(
      environment.assetsPath,
      "combinations",
      `${prefix}.json`,
    );
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const group = JSON.parse(rawData);
    return group[unicode] || {};
  } catch (e) {
    console.error(`Failed to load combinations for ${unicode}`, e);
    return {};
  }
}
