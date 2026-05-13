import { Clipboard } from "@raycast/api";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { extractRawImageFromClipboard } from "./extractFromClipboard";

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];

function isImagePath(p: string): boolean {
  return IMAGE_EXTS.some((ext) => p.toLowerCase().endsWith(ext));
}

function normalizeFileUrl(value: string): string {
  return value.startsWith("file://") ? fileURLToPath(value) : value;
}

export async function readClipboardImage(): Promise<string> {
  const content = await Clipboard.read();
  if (content.file) {
    const path = normalizeFileUrl(content.file);
    if (existsSync(path) && isImagePath(path)) {
      return path;
    }
  }
  return extractRawImageFromClipboard();
}
