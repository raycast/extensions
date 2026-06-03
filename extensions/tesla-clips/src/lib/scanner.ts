/**
 * TeslaCam filesystem scanning, clip parsing, and gap detection.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { CLIP_NAME_PATTERN, TESLA_SEGMENT_INTERVAL_SECONDS } from "../constants";
import { logger } from "./logger";
import type { CameraGroup, ClipParseResult, ClipSegment, GapInfo, ScanResult, TeslaEvent } from "../types";

/**
 * Parses a Tesla clip filename into timestamp and camera id.
 *
 * @param filename - Base filename (not a full path).
 * @returns Parsed fields or `null` when the name does not match {@link CLIP_NAME_PATTERN}.
 */
export function parseClipFilename(filename: string): ClipParseResult | null {
  const match = CLIP_NAME_PATTERN.exec(filename);
  if (!match) {
    return null;
  }

  const [, timestamp, rawCamera] = match;
  if (!timestamp || !rawCamera) {
    return null;
  }

  return {
    timestamp,
    camera: rawCamera.toLowerCase(),
  };
}

/**
 * Recursively finds directories that contain at least one Tesla clip file.
 *
 * @param root - Source root to scan.
 * @returns Sorted absolute paths to event directories.
 */
export async function findEventDirs(root: string): Promise<string[]> {
  const queue: string[] = [root];
  const eventDirs: string[] = [];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir) {
      continue;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    let hasClip = false;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) {
          queue.push(path.join(currentDir, entry.name));
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (parseClipFilename(entry.name)) {
        hasClip = true;
      }
    }

    if (hasClip) {
      eventDirs.push(currentDir);
    }
  }

  eventDirs.sort((a, b) => a.localeCompare(b));
  logger.debug("Discovered event directories", { root, eventCount: eventDirs.length });
  return eventDirs;
}

/**
 * Groups clip files in an event folder by camera, sorted by timestamp.
 *
 * @param eventDir - Absolute path to a Tesla event directory.
 * @returns Map of camera id to ordered {@link ClipSegment} list.
 */
export async function collectSegmentsByCamera(eventDir: string): Promise<Map<string, ClipSegment[]>> {
  const entries = await fs.readdir(eventDir, { withFileTypes: true });
  const byCamera = new Map<string, ClipSegment[]>();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const clip = parseClipFilename(entry.name);
    if (!clip) {
      continue;
    }

    const segment: ClipSegment = {
      timestamp: clip.timestamp,
      camera: clip.camera,
      filePath: path.join(eventDir, entry.name),
    };

    const existing = byCamera.get(clip.camera);
    if (existing) {
      existing.push(segment);
    } else {
      byCamera.set(clip.camera, [segment]);
    }
  }

  for (const segments of byCamera.values()) {
    segments.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  const cameraSummary = [...byCamera.entries()].map(([camera, segments]) => ({
    camera,
    segments: segments.length,
  }));
  logger.debug("Grouped clips by camera", { eventDir: path.basename(eventDir), cameras: cameraSummary });

  return byCamera;
}

function parseTimestamp(ts: string): Date | null {
  // Format: 2024-01-15_12-30-00
  const match = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/.exec(ts);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  if (!year || !month || !day || !hour || !minute || !second) {
    return null;
  }
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10),
  );
}

/**
 * Finds timeline gaps where consecutive segments exceed twice the expected Tesla interval.
 *
 * @param segments - Time-ordered segments for one camera.
 * @returns Gap records between non-adjacent clip times.
 */
export function detectGaps(segments: ClipSegment[]): GapInfo[] {
  const gaps: GapInfo[] = [];
  const maxExpectedInterval = TESLA_SEGMENT_INTERVAL_SECONDS * 2;

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    if (!prev || !curr) {
      continue;
    }

    const prevDate = parseTimestamp(prev.timestamp);
    const currDate = parseTimestamp(curr.timestamp);
    if (!prevDate || !currDate) {
      continue;
    }

    const diffSeconds = (currDate.getTime() - prevDate.getTime()) / 1000;
    if (diffSeconds > maxExpectedInterval) {
      gaps.push({
        beforeTimestamp: prev.timestamp,
        afterTimestamp: curr.timestamp,
        gapSeconds: diffSeconds,
      });
    }
  }

  return gaps;
}

/**
 * Builds per-camera groups with gap metadata for UI and merge planning.
 *
 * @param cameraMap - Segments grouped by camera from {@link collectSegmentsByCamera}.
 * @returns Camera groups sorted by camera id.
 */
export function buildCameraGroups(cameraMap: Map<string, ClipSegment[]>): CameraGroup[] {
  const groups: CameraGroup[] = [];
  for (const [camera, segments] of cameraMap.entries()) {
    groups.push({
      camera,
      segments,
      gaps: detectGaps(segments),
    });
  }
  groups.sort((a, b) => a.camera.localeCompare(b.camera));
  return groups;
}

/**
 * Materializes {@link TeslaEvent} models from discovered event directories.
 *
 * @param root - Source root path (stored on each event as `sourceRoot`).
 * @param eventDirs - Event directory paths from {@link findEventDirs}.
 * @returns Events with cameras, segment counts, and gap totals.
 */
export async function buildTeslaEvents(root: string, eventDirs: string[]): Promise<TeslaEvent[]> {
  const events: TeslaEvent[] = [];

  for (const eventDir of eventDirs) {
    const cameraMap = await collectSegmentsByCamera(eventDir);
    if (cameraMap.size === 0) {
      continue;
    }

    const cameras = buildCameraGroups(cameraMap);
    const totalSegments = cameras.reduce((sum, g) => sum + g.segments.length, 0);
    const totalGaps = cameras.reduce((sum, g) => sum + g.gaps.length, 0);

    events.push({
      id: `${root}::${eventDir}`,
      eventDir,
      sourceRoot: root,
      folderName: path.basename(eventDir),
      cameras,
      totalSegments,
      totalGaps,
    });
  }

  logger.info("Built Tesla events", { root: path.basename(root), eventCount: events.length });
  return events;
}

/**
 * Scans a single source root and returns aggregate scan statistics.
 *
 * @param root - Absolute TeslaCam source root.
 * @returns Events and rolled-up camera/segment/gap counts.
 */
export async function scanRoot(root: string): Promise<ScanResult> {
  logger.info("Scanning source root", { root });
  const eventDirs = await findEventDirs(root);
  const events = await buildTeslaEvents(root, eventDirs);

  const totalCameras = events.reduce((sum, e) => sum + e.cameras.length, 0);
  const totalSegments = events.reduce((sum, e) => sum + e.totalSegments, 0);
  const totalGaps = events.reduce((sum, e) => sum + e.totalGaps, 0);

  logger.info("Source root scan completed", {
    root: path.basename(root),
    events: events.length,
    cameras: totalCameras,
    segments: totalSegments,
    gaps: totalGaps,
  });

  return {
    events,
    totalEvents: events.length,
    totalCameras,
    totalSegments,
    totalGaps,
  };
}
