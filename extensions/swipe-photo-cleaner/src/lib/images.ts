import { readdir, stat, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { environment } from "@raycast/api";
import { IMAGE_EXTENSIONS } from "./formats";
import { PhotoItem } from "../types";

const execFileAsync = promisify(execFile);
const THUMB_DIR = path.join(environment.supportPath, "thumbnails");
const MAX_HEIGHT = 800;

export async function scanFolder(dirPath: string): Promise<PhotoItem[]> {
  const photos: PhotoItem[] = [];

  async function scan(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(ext)) continue;
        const fileStat = await stat(fullPath);
        photos.push({
          path: fullPath,
          name: entry.name,
          size: fileStat.size,
          modifiedAt: fileStat.mtime,
          createdAt: fileStat.birthtime,
        });
      }
    }
  }

  await scan(dirPath);
  photos.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return photos;
}

async function getImageDimensions(
  filePath: string,
): Promise<{ w: number; h: number }> {
  const { stdout } = await execFileAsync("sips", [
    "-g",
    "pixelWidth",
    "-g",
    "pixelHeight",
    filePath,
  ]);
  const w = parseInt(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] ?? "0");
  const h = parseInt(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] ?? "0");
  return { w, h };
}

export async function getThumbnail(filePath: string): Promise<string> {
  await mkdir(THUMB_DIR, { recursive: true });
  const hash = Buffer.from(filePath).toString("base64url");
  const ext = path.extname(filePath);
  const thumbPath = path.join(THUMB_DIR, `${hash}${ext}`);

  try {
    await stat(thumbPath);
    return thumbPath;
  } catch {
    // Thumbnail doesn't exist yet — generate it
  }

  try {
    const { w, h } = await getImageDimensions(filePath);
    const isPortrait = h > w;

    if (!isPortrait) {
      // Landscape/square: use original file — Raycast scales down to fill width
      return filePath;
    }

    await execFileAsync("sips", [
      "--resampleHeight",
      String(MAX_HEIGHT),
      filePath,
      "--out",
      thumbPath,
    ]);
    return thumbPath;
  } catch {
    return filePath;
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
