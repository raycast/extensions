/**
 * Pre-merge readiness assessment, existing output detection, and overwrite planning.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { EventExistingState, EventMergeReadiness, MergeReadinessJob, ScanResult, TeslaEvent } from "../types";
import { resolveEventOutputDir, resolveMergedOutputFilename } from "./paths";

/** Minimum byte size for a merged MP4 to be treated as valid (excludes corrupt ffmpeg stubs). */
export const MIN_VALID_MERGED_OUTPUT_BYTES = 1024;

/**
 * Returns whether a file size meets the minimum valid merged output threshold.
 *
 * @param sizeBytes - File size from `fs.stat`.
 * @returns `true` when size is at least {@link MIN_VALID_MERGED_OUTPUT_BYTES}.
 */
export function isValidMergedOutputSize(sizeBytes: number): boolean {
  return sizeBytes >= MIN_VALID_MERGED_OUTPUT_BYTES;
}

/**
 * Checks that a path exists, is a file, and passes {@link isValidMergedOutputSize}.
 *
 * @param filePath - Absolute path to a candidate merged output.
 * @returns `true` when the file is a valid merged output.
 */
export async function isValidMergedOutput(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && isValidMergedOutputSize(stats.size);
  } catch {
    return false;
  }
}

/**
 * Stable key for per-camera overwrite selection in merge review UI.
 *
 * @param eventDir - Absolute event directory path.
 * @param camera - Tesla camera id.
 * @returns Unique key `eventDir::camera`.
 */
export function getMergeOutputKey(eventDir: string, camera: string): string {
  return `${eventDir}::${camera}`;
}

function resolveExistingState(mergeableJobs: readonly MergeReadinessJob[]): EventExistingState {
  if (mergeableJobs.length === 0) {
    return "none";
  }

  const existingCount = mergeableJobs.filter((job) => job.hasExistingOutput).length;
  if (existingCount === 0) {
    return "none";
  }

  if (existingCount === mergeableJobs.length) {
    return "complete";
  }

  return "partial";
}

/**
 * Scans merged output directory and builds per-camera merge readiness for an event.
 *
 * @param event - Scanned Tesla event (cameras and segments required).
 * @param outputRootPath - Optional custom output root from preferences.
 * @returns Readiness jobs, existing state, and output directory metadata.
 */
export async function assessEventMergeReadiness(
  event: TeslaEvent,
  outputRootPath?: string,
): Promise<EventMergeReadiness> {
  const outputDir = resolveEventOutputDir(event.eventDir, event.sourceRoot, outputRootPath);
  const jobs: MergeReadinessJob[] = [];
  let hasMergedOutputDir = false;
  let mergedOutputFileCount = 0;

  try {
    const entries = await fs.readdir(outputDir);
    mergedOutputFileCount = entries.filter((entry) => entry.endsWith(".mp4")).length;
    hasMergedOutputDir = mergedOutputFileCount > 0;
  } catch {
    hasMergedOutputDir = false;
    mergedOutputFileCount = 0;
  }

  for (const group of event.cameras) {
    const outputFilename = resolveMergedOutputFilename(group.camera, event.folderName);
    const outputPath = path.join(outputDir, outputFilename);
    const hasExistingOutput = await isValidMergedOutput(outputPath);

    jobs.push({
      camera: group.camera,
      outputPath,
      outputFilename,
      segmentCount: group.segments.length,
      hasExistingOutput,
      isMergeable: group.segments.length >= 2,
    });
  }

  const mergeableJobs = jobs.filter((job) => job.isMergeable);
  const existingState = resolveExistingState(mergeableJobs);

  return {
    existingState,
    existingOutputCount: mergeableJobs.filter((job) => job.hasExistingOutput).length,
    mergeableCount: mergeableJobs.length,
    pendingMergeCount: mergeableJobs.filter((job) => !job.hasExistingOutput).length,
    hasMergedOutputDir,
    mergedOutputFileCount,
    jobs,
  };
}

/**
 * Attaches {@link EventMergeReadiness} to each event in parallel.
 *
 * @param events - Events from scan (without readiness).
 * @param outputRootPath - Optional custom output root.
 * @returns Events with `readiness` populated.
 */
export async function enrichEventsWithReadiness(events: TeslaEvent[], outputRootPath?: string): Promise<TeslaEvent[]> {
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      readiness: await assessEventMergeReadiness(event, outputRootPath),
    })),
  );
}

/**
 * Updates scan totals after readiness enrichment.
 *
 * @param scanResult - Base scan result counts.
 * @param events - Events including `readiness`.
 * @returns Scan result with events and existing/partial event counts.
 */
export function enrichScanResultWithReadiness(scanResult: ScanResult, events: TeslaEvent[]): ScanResult {
  const existingEvents = events.filter((event) => event.readiness?.existingState === "complete").length;
  const partialExistingEvents = events.filter((event) => event.readiness?.existingState === "partial").length;

  return {
    ...scanResult,
    events,
    totalExistingEvents: existingEvents,
    totalPartialExistingEvents: partialExistingEvents,
  };
}

/**
 * Returns whether the event has at least one valid existing merged output.
 *
 * @param event - Event with optional `readiness`.
 * @returns `true` when `existingOutputCount` is greater than zero.
 */
export function eventHasExistingOutputs(event: TeslaEvent): boolean {
  return event.readiness?.existingOutputCount !== undefined && event.readiness.existingOutputCount > 0;
}

/**
 * Returns whether any event has mergeable cameras with existing outputs (needs overwrite review).
 *
 * @param events - Events with readiness attached.
 * @returns `true` when overwrite review UI should be shown.
 */
export function eventsNeedMergeReview(events: readonly TeslaEvent[]): boolean {
  return events.some((event) => {
    const mergeableWithExisting = event.readiness?.jobs.filter((job) => job.isMergeable && job.hasExistingOutput);
    return mergeableWithExisting !== undefined && mergeableWithExisting.length > 0;
  });
}

/**
 * Builds the initial set of overwrite keys from the global overwrite preference.
 *
 * @param events - Events with readiness.
 * @param overwriteExistingDefault - When `true`, all existing mergeable outputs start selected for overwrite.
 * @returns Set of {@link getMergeOutputKey} values.
 */
export function buildInitialOverwriteKeys(
  events: readonly TeslaEvent[],
  overwriteExistingDefault: boolean,
): Set<string> {
  const keys = new Set<string>();

  if (!overwriteExistingDefault) {
    return keys;
  }

  for (const event of events) {
    for (const job of event.readiness?.jobs ?? []) {
      if (job.isMergeable && job.hasExistingOutput) {
        keys.add(getMergeOutputKey(event.eventDir, job.camera));
      }
    }
  }

  return keys;
}

/**
 * Counts camera merge jobs that will run given current overwrite selections.
 *
 * @param events - Events with readiness.
 * @param overwriteKeys - Per-output keys selected for overwrite.
 * @returns Number of mergeable cameras without valid output or marked for overwrite.
 */
export function countPlannedMerges(events: readonly TeslaEvent[], overwriteKeys: ReadonlySet<string>): number {
  let count = 0;

  for (const event of events) {
    for (const job of event.readiness?.jobs ?? []) {
      if (!job.isMergeable) {
        continue;
      }

      if (!job.hasExistingOutput || overwriteKeys.has(getMergeOutputKey(event.eventDir, job.camera))) {
        count += 1;
      }
    }
  }

  return count;
}

/**
 * Counts mergeable cameras with existing outputs across events.
 *
 * @param events - Events with readiness attached.
 * @returns Total existing mergeable jobs.
 */
export function countExistingMergeableJobs(events: readonly TeslaEvent[]): number {
  return events.reduce(
    (count, event) =>
      count + (event.readiness?.jobs.filter((job) => job.isMergeable && job.hasExistingOutput).length ?? 0),
    0,
  );
}

/**
 * Counts mergeable cameras with existing outputs for one event.
 *
 * @param event - Event with readiness attached.
 * @returns Existing mergeable job count for the event.
 */
export function countEventExistingMergeableJobs(event: TeslaEvent): number {
  return event.readiness?.jobs.filter((job) => job.isMergeable && job.hasExistingOutput).length ?? 0;
}

/**
 * Determines whether an existing merged file should be replaced for a camera.
 *
 * @param eventDir - Event directory path.
 * @param camera - Camera id.
 * @param options - Merge options with per-output or global overwrite flags.
 * @returns `true` when the merge should overwrite an existing valid output.
 */
export function shouldOverwriteOutput(eventDir: string, camera: string, options: MergeOptionsLike): boolean {
  const key = getMergeOutputKey(eventDir, camera);
  if (options.overwriteOutputs) {
    return options.overwriteOutputs.has(key);
  }

  return options.overwriteExisting;
}

/** Subset of merge options used for overwrite resolution. */
type MergeOptionsLike = {
  readonly overwriteExisting: boolean;
  readonly overwriteOutputs?: ReadonlySet<string>;
};
