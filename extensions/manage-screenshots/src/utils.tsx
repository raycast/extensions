import { getPreferenceValues, trash } from "@raycast/api";
import { existsSync, lstatSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import untildify from "untildify";

export interface ScreenshotFile {
  name: string;
  path: string;
  size: number;
  date: Date;
}

export function getScreenshotsDirectory(): string {
  const preferences = getPreferenceValues<{ screenshotsDirectory?: string }>();

  if (preferences.screenshotsDirectory) {
    const dir = untildify(preferences.screenshotsDirectory);
    if (existsSync(dir) && lstatSync(dir).isDirectory()) {
      return dir;
    }
  }

  // Default fallback
  const defaultPath = join(homedir(), "Pictures", "Screenshots");
  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  return join(homedir(), "Pictures");
}

export function getScreenshots(directory: string): ScreenshotFile[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files = readdirSync(directory);

  return files
    .filter((file) => !file.startsWith(".")) // Ignore hidden files
    .map((file) => {
      const filePath = join(directory, file);
      try {
        const stats = lstatSync(filePath);
        if (!stats.isFile()) return null;

        // Basic image extension check
        if (!/\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(file)) return null;

        return {
          name: file,
          path: filePath,
          size: stats.size,
          date: stats.mtime,
        };
      } catch {
        return null;
      }
    })
    .filter((file): file is ScreenshotFile => file !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function deleteFile(path: string) {
  try {
    await trash(path);
  } catch (e) {
    console.error("Failed to move file to trash:", e);
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
