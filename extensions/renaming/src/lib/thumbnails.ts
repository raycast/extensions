/**
 * Thumbnail generation for file previews
 *
 * Uses macOS Quick Look to generate thumbnails. Rather than maintaining
 * a list of supported formats, we just try qlmanage and handle failure —
 * this automatically supports any Quick Look plugin the user has installed.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { access, mkdir } from "fs/promises";
import { constants } from "fs";
import { basename, join } from "path";
import { tmpdir } from "os";
import { createHash } from "crypto";
import { FILE_CONSTANTS } from "./constants";
import { log } from "./logger";

const execAsync = promisify(exec);

// Cache directory for generated thumbnails
const THUMBNAIL_CACHE_DIR = join(tmpdir(), FILE_CONSTANTS.THUMBNAIL_CACHE_DIR);

/**
 * Generate a cache key for a file based on path and modification time
 */
function getCacheKey(filePath: string): string {
  const hash = createHash("md5").update(filePath).digest("hex").slice(0, 12);
  const name = basename(filePath)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 20);
  return `${name}_${hash}`;
}

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await access(THUMBNAIL_CACHE_DIR, constants.F_OK);
  } catch {
    await mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
  }
}

/**
 * Check if a thumbnail already exists in cache
 */
async function getThumbnailFromCache(filePath: string): Promise<string | null> {
  const cacheKey = getCacheKey(filePath);
  const thumbnailPath = join(THUMBNAIL_CACHE_DIR, `${cacheKey}.png`);

  try {
    await access(thumbnailPath, constants.F_OK);
    return thumbnailPath;
  } catch {
    return null;
  }
}

/**
 * Generate a thumbnail for a file using Quick Look.
 * Returns the path to the generated thumbnail, or null if generation failed.
 *
 * No format pre-check — qlmanage knows what it supports and fails fast
 * for unsupported formats.
 */
export async function generateThumbnail(
  filePath: string,
  size: number = FILE_CONSTANTS.THUMBNAIL_SIZE,
): Promise<string | null> {
  // Check cache first
  const cached = await getThumbnailFromCache(filePath);
  if (cached) {
    return cached;
  }

  try {
    await ensureCacheDir();

    const cacheKey = getCacheKey(filePath);
    const outputPath = join(THUMBNAIL_CACHE_DIR, `${cacheKey}.png`);

    // Escape the file path for shell
    const escapedPath = filePath.replace(/'/g, "'\\''");

    // Use qlmanage to generate thumbnail
    // -t = generate thumbnail, -s = size, -o = output directory
    await execAsync(`qlmanage -t -s ${size} -o '${THUMBNAIL_CACHE_DIR}' '${escapedPath}'`, {
      timeout: FILE_CONSTANTS.THUMBNAIL_TIMEOUT,
    });

    // qlmanage outputs to filename.extension.png, rename to our cache key
    const qlOutputPath = join(THUMBNAIL_CACHE_DIR, `${basename(filePath)}.png`);

    try {
      await access(qlOutputPath, constants.F_OK);
      // Rename to our cache key
      await execAsync(`mv '${qlOutputPath}' '${outputPath}'`);
      return outputPath;
    } catch {
      // qlmanage might output directly to the expected path in some cases
      try {
        await access(outputPath, constants.F_OK);
        return outputPath;
      } catch {
        return null;
      }
    }
  } catch (error) {
    log.thumbnails.warn(`Thumbnail generation failed for "${filePath}"`, error);
    return null;
  }
}

/**
 * Get thumbnail path for a file, generating if necessary
 * This is the main function to use for getting thumbnails
 */
export async function getThumbnail(filePath: string): Promise<string | null> {
  return generateThumbnail(filePath);
}
