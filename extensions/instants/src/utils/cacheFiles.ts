import { environment } from "@raycast/api";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { Sound } from "../types";

const CACHE_DIR_NAME = "instants-cache";

function getCacheDir(): string {
  return path.join(environment.supportPath, CACHE_DIR_NAME);
}

export async function ensureCacheDir(): Promise<string> {
  const dir = getCacheDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

/** Safe filename from sound id (avoid path traversal). */
function cacheFileName(sound: Sound): string {
  const safe = sound.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safe}.mp3`;
}

/** Download a sound to the persistent cache and return the local path. */
export async function downloadSoundToCache(sound: Sound): Promise<string> {
  const dir = await ensureCacheDir();
  const filePath = path.join(dir, cacheFileName(sound));

  const response = await fetch(sound.soundUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
  return filePath;
}

/** Remove cached file for a sound (e.g. when removed from favorites). */
export async function removeCachedFile(sound: Sound): Promise<void> {
  const dir = getCacheDir();
  const filePath = path.join(dir, cacheFileName(sound));
  if (existsSync(filePath)) {
    await unlink(filePath).catch(() => {});
  }
}

export function getCachedPath(sound: Sound): string | null {
  const filePath = path.join(getCacheDir(), cacheFileName(sound));
  return existsSync(filePath) ? filePath : null;
}
