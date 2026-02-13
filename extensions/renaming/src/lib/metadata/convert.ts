/**
 * Converts FileMetadata (from metadata extractors) to FileMetadataContext (for templates/AI).
 */

import type { FileMetadata } from "./types";
import type { FileMetadataContext } from "../../types";

export function toFileMetadataContext(metadata: FileMetadata): FileMetadataContext | null {
  if (!metadata.basic) return null;

  const context: FileMetadataContext = {
    size: metadata.basic.size,
    created: metadata.basic.created,
    modified: metadata.basic.modified,
  };

  if (metadata.exif) {
    context.exif = {
      dateTaken: metadata.exif.dateTaken,
      width: metadata.exif.width,
      height: metadata.exif.height,
      camera: metadata.exif.camera,
      cameraMake: metadata.exif.cameraMake,
      cameraModel: metadata.exif.cameraModel,
    };
  }

  if (metadata.spotlight) {
    context.spotlight = {
      duration: metadata.spotlight.duration,
      artist: metadata.spotlight.artist,
      album: metadata.spotlight.album,
      title: metadata.spotlight.title,
      pixelWidth: metadata.spotlight.pixelWidth,
      pixelHeight: metadata.spotlight.pixelHeight,
      pageCount: metadata.spotlight.pageCount,
      audioChannelCount: metadata.spotlight.audioChannels,
      audioBitRate: metadata.spotlight.audioBitRate,
    };
  }

  return context;
}
