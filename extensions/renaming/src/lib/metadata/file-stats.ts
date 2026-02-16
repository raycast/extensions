/**
 * Basic file metadata from fs.stat
 */

import { stat } from "fs/promises";
import type { BasicFileMetadata } from "./types";

/**
 * Format bytes into human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get basic file metadata using fs.stat
 */
export async function getBasicMetadata(filePath: string): Promise<BasicFileMetadata | null> {
  try {
    const stats = await stat(filePath);

    return {
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
    };
  } catch {
    return null;
  }
}
