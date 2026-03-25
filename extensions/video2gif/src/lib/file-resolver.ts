import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { existsSync, realpathSync } from "fs";
import path from "path";
import { SUPPORTED_EXTENSIONS } from "../types";

export function isSupportedVideo(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function getUnsupportedExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Resolves a video file from:
 * 1. Selected Finder items
 * 2. Clipboard file path
 * Returns null if no valid video found.
 */
export async function resolveVideoFile(): Promise<string | null> {
  // 1. Try selected Finder items
  try {
    const items = await getSelectedFinderItems();
    if (items.length > 0) {
      const filePath = items[0].path;
      if (isSupportedVideo(filePath)) {
        return path.resolve(filePath);
      }
    }
  } catch (error) {
    // getSelectedFinderItems throws when Finder is not frontmost — that's expected.
    if (error instanceof Error && !error.message.includes("Finder")) {
      console.error("Unexpected error resolving Finder selection:", error);
    }
  }

  // 2. Try clipboard
  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      const trimmed = clipboardText.trim();
      // Reject relative paths
      if (!path.isAbsolute(trimmed)) return null;
      if (existsSync(trimmed) && isSupportedVideo(trimmed)) {
        // Resolve symlinks and re-validate extension
        const realPath = realpathSync(trimmed);
        if (isSupportedVideo(realPath)) {
          return realPath;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes("clipboard")) {
      console.error("Unexpected error reading clipboard:", error);
    }
  }

  return null;
}
