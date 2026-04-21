import { readFile } from "fs/promises";
import { extname } from "path";
import { KNOWN_EXECUTABLE_EXTENSIONS, KNOWN_TEXT_EXTENSIONS } from "./constants";

export async function isTextFile(filePath: string): Promise<boolean> {
  try {
    const buffer = await readFile(filePath, { encoding: null });
    const sample = buffer.slice(0, Math.min(512, buffer.length));

    // Check for null bytes (binary indicator)
    const nullBytes = sample.filter((byte) => byte === 0).length;

    // If more than 1% null bytes, likely binary
    return nullBytes / sample.length < 0.01;
  } catch {
    return false;
  }
}

export function isExecutableFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return KNOWN_EXECUTABLE_EXTENSIONS.has(ext);
}

export async function isFilePreviewable(filePath: string, fileSize?: number): Promise<boolean> {
  const ext = extname(filePath).toLowerCase();

  // Known text extensions - fast path
  if (KNOWN_TEXT_EXTENSIONS.has(ext)) return true;

  // Unknown extension or no extension - content detection for small files only
  if (!KNOWN_TEXT_EXTENSIONS.has(ext) && fileSize && fileSize < 10000) {
    return await isTextFile(filePath);
  }

  return false;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function truncatePath(path: string, maxLength = 50): string {
  if (path.length <= maxLength) return path;

  const pathSeparator = path.includes("\\") ? "\\" : "/";
  const parts = path.split(pathSeparator);

  if (parts.length <= 3) return path;

  // Always keep the first two parts (drive + first folder) and last part
  const first = parts[0];
  const second = parts[1];
  const last = parts[parts.length - 1];
  const ellipsis = "...";

  // Build: first + separator + second + separator + ellipsis + separator + last
  const basicTruncated = `${first}${pathSeparator}${second}${pathSeparator}${ellipsis}${pathSeparator}${last}`;
  if (basicTruncated.length <= maxLength) {
    return basicTruncated;
  }

  // If still too long, truncate the last part
  const fixedPart = `${first}${pathSeparator}${second}${pathSeparator}${ellipsis}${pathSeparator}`;
  const availableSpace = maxLength - fixedPart.length;
  if (availableSpace > 0) {
    const truncatedLast = last.length > availableSpace ? last.substring(0, availableSpace - 3) + "..." : last;
    return `${fixedPart}${truncatedLast}`;
  }

  // If extremely long, just show first two parts with ellipsis
  return `${first}${pathSeparator}${second}${pathSeparator}${ellipsis}`;
}

export function parseEsDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Parse date format: "22/07/2025 16:18"
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/);
  if (!match) return undefined;

  const [, day, month, year, hour, minute] = match;
  // JavaScript Date constructor expects month to be 0-indexed
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
}
