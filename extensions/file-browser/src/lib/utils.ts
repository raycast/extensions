import { statSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

export function formatFileSize(bytes?: number | null): string | undefined {
  if (!bytes || bytes < 0) {
    return undefined;
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function convertDate(seconds: number): Date {
  return new Date(seconds * 1000);
}

export function resolveStartDirectory(preferencePath: string | undefined) {
  if (preferencePath) {
    try {
      const resolvedPath = resolve(preferencePath);
      const stats = statSync(resolvedPath);
      if (stats.isDirectory()) {
        return resolvedPath;
      }
    } catch (error) {
      console.warn("Failed to read start directory preference:", error);
    }
  }

  return homedir();
}

export function pathExists(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}
