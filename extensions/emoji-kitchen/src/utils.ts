import { showToast, Toast, Clipboard, showHUD, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { EmojiMetadata, Combinations } from "./types";

export function getGStaticUrl(left: string, right: string, date: string) {
  const pLeft = `u${left.toLowerCase().replace(/-/g, "-u")}`;
  const pRight = `u${right.toLowerCase().replace(/-/g, "-u")}`;
  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${pLeft}/${pLeft}_${pRight}.png`;
}

export async function copyImageToClipboard(url: string, name: string) {
  const toast = await showToast({
    title: "Copying image...",
    style: Toast.Style.Animated,
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download image");
    
    const buffer = await response.arrayBuffer();
    const tempFile = path.join(os.tmpdir(), `${name.replace(/[^a-z0-9]/gi, "_")}.png`);
    
    fs.writeFileSync(tempFile, new Uint8Array(buffer));
    
    await Clipboard.copy({ file: tempFile });
    await showHUD("Image copied to clipboard");
    toast.hide();
  } catch (error) {
    toast.title = "Failed to copy image";
    toast.message = String(error);
    toast.style = Toast.Style.Failure;
  }
}

let _cachedIndex: Record<string, EmojiMetadata> | null = null;

export function loadEmojiIndex(): Record<string, EmojiMetadata> {
  if (_cachedIndex) return _cachedIndex;
  const dataPath = path.join(environment.assetsPath, "index.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  _cachedIndex = JSON.parse(rawData);
  return _cachedIndex!;
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
