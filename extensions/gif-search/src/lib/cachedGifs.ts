import { environment } from "@raycast/api";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import path from "path";

const cachedGifsDir = path.join(environment.supportPath, "cached-gifs");

/**
 * Removes a GIF from the cache directory.
 * @param fileName The filename of the GIF to remove from the cache.
 */
export async function removeGifFromCache(fileName: string) {
  const cachedFilePath = path.join(cachedGifsDir, fileName);
  if (existsSync(cachedFilePath)) {
    try {
      await unlink(cachedFilePath);
    } catch (error) {
      console.error(`Failed to remove cached GIF: ${fileName}`, error);
    }
  }
}

/**
 * Retrieves a GIF from the cache directory if it exists.
 * @param fileName The filename of the GIF to fetch from the cache.
 */
export async function getGifFromCache(fileName: string) {
  const cachedFilePath = path.join(cachedGifsDir, fileName);
  if (existsSync(cachedFilePath)) {
    return cachedFilePath;
  }
  return null;
}

/**
 * Saves a GIF to the cache directory.
 * @param file The file to save to the cache.
 * @param fileName The filename to save the file as.
 */
export async function saveGifToCache(file: string, fileName: string) {
  // Ensure the cache directory exists
  if (!existsSync(cachedGifsDir)) {
    mkdirSync(cachedGifsDir, { recursive: true });
  }

  const cachedFilePath = path.join(cachedGifsDir, fileName);
  return copyFileSync(file, cachedFilePath);
}
