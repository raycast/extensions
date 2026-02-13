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
  const [basic, exif, spotlight] = await Promise.all([
    getBasicMetadata(filePath),
    getExifMetadata(filePath),
    getSpotlightMetadata(filePath),
  ]);

  return {
    basic: basic || undefined,
    exif: exif || undefined,
    spotlight: spotlight || undefined,
  };
}

/**
 * Check if the file is an image based on extension
 */
export function isImageFile(filePath: string): boolean {
  return isImage(filePath);
}
