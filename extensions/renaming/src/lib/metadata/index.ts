/**
 * File metadata aggregator
 * Combines fs.stat, EXIF, and Spotlight metadata
 */

import { getBasicMetadata } from "./file-stats";
import { getExifMetadata } from "./exif";
import { getSpotlightMetadata } from "./spotlight";
import { isImage } from "../file-types";
import type { FileMetadata } from "./types";

export type { FileMetadata, BasicFileMetadata, ImageExifMetadata, SpotlightMetadata } from "./types";

/**
 * Get all available metadata for a file
 * Runs all metadata extractors in parallel for performance
 */
export async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const results = await Promise.allSettled([
    getBasicMetadata(filePath),
    isImage(filePath) ? getExifMetadata(filePath) : Promise.resolve(null),
    getSpotlightMetadata(filePath),
  ]);

  return {
    basic: (results[0].status === "fulfilled" ? results[0].value : null) || undefined,
    exif: (results[1].status === "fulfilled" ? results[1].value : null) || undefined,
    spotlight: (results[2].status === "fulfilled" ? results[2].value : null) || undefined,
  };
}

/**
 * Check if the file is an image based on extension
 */
export function isImageFile(filePath: string): boolean {
  return isImage(filePath);
}
