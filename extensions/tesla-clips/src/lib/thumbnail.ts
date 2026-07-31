/**
 * ffmpeg-generated event preview thumbnails with disk and memory caching.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ClipSegment, TeslaEvent } from "../types";
import { execFileAsync } from "./exec";
import { logger } from "./logger";

const thumbnailCache = new Map<string, string>();

const PREVIEW_CAMERA_PRIORITY = ["front", "narrow_front", "back", "left_repeater", "right_repeater"] as const;

/**
 * Chooses the first available segment from preferred front/rear cameras for previews.
 *
 * @param event - Tesla event with camera groups.
 * @returns First segment of the highest-priority camera, or any first segment.
 */
export function pickPreviewSegment(event: TeslaEvent): ClipSegment | undefined {
  for (const camera of PREVIEW_CAMERA_PRIORITY) {
    const group = event.cameras.find((entry) => entry.camera === camera);
    const firstSegment = group?.segments[0];
    if (firstSegment) {
      return firstSegment;
    }
  }

  return event.cameras[0]?.segments[0];
}

function getThumbnailCachePath(sourceVideoPath: string, mtimeMs: number): string {
  const hash = createHash("sha256").update(`${sourceVideoPath}:${mtimeMs}`).digest("hex").slice(0, 16);
  return path.join(os.tmpdir(), `tesla-clips-thumb-${hash}.jpg`);
}

/**
 * Encodes a local JPEG path as a markdown image URI.
 *
 * @param thumbnailPath - Absolute path to a JPEG file.
 * @returns `file://` URI with spaces percent-encoded.
 */
export function thumbnailPathToMarkdownUri(thumbnailPath: string): string {
  return `file://${thumbnailPath.replace(/ /g, "%20")}`;
}

/**
 * Builds event detail markdown with optional preview image.
 *
 * @param thumbnailPath - Optional absolute JPEG path from {@link resolveEventThumbnail}.
 * @returns Markdown including merge explanation text.
 */
export function buildEventDetailMarkdown(thumbnailPath?: string): string {
  const lines: string[] = [];

  if (thumbnailPath) {
    lines.push(`![Front camera preview](${thumbnailPathToMarkdownUri(thumbnailPath)})`, "");
  }

  lines.push("Merge creates one continuous video per camera using stream copy (no re-encoding).");
  return lines.join("\n");
}

/**
 * Resolves or generates a cached JPEG thumbnail for an event's preview segment.
 *
 * @param event - Tesla event to preview.
 * @param ffmpegPath - Resolved ffmpeg executable path.
 * @returns Absolute JPEG path, or `undefined` when no segment or generation fails.
 */
export async function resolveEventThumbnail(event: TeslaEvent, ffmpegPath: string): Promise<string | undefined> {
  const segment = pickPreviewSegment(event);
  if (!segment) {
    return undefined;
  }

  let mtimeMs: number;
  try {
    mtimeMs = (await fs.stat(segment.filePath)).mtimeMs;
  } catch {
    return undefined;
  }

  const cachePath = getThumbnailCachePath(segment.filePath, mtimeMs);
  const memoryCached = thumbnailCache.get(cachePath);
  if (memoryCached) {
    return memoryCached;
  }

  try {
    await fs.access(cachePath);
    thumbnailCache.set(cachePath, cachePath);
    return cachePath;
  } catch {
    // Generate a fresh thumbnail below.
  }

  try {
    await execFileAsync(ffmpegPath, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      "0",
      "-i",
      segment.filePath,
      "-vframes",
      "1",
      "-q:v",
      "2",
      "-y",
      cachePath,
    ]);
    await fs.access(cachePath);
    thumbnailCache.set(cachePath, cachePath);
    return cachePath;
  } catch (error) {
    logger.warn("Failed generating event thumbnail", {
      segmentPath: segment.filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
