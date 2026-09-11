/**
 * Trash merged output folders and cleanup run UI helpers.
 */

import { confirmAlert, trash } from "@raycast/api";
import { directoryExists, resolveEventOutputDir } from "./paths";
import { eventHasExistingOutputs } from "./merge-readiness";
import type { CleanupEventResult, CleanupRunResult, TeslaEvent } from "../types";

/**
 * Returns whether the event has a merged output directory (valid or invalid files).
 *
 * @param event - Event with readiness attached.
 * @returns `true` when `hasMergedOutputDir` is set on readiness.
 */
export function eventHasMergedOutputDir(event: TeslaEvent): boolean {
  return event.readiness?.hasMergedOutputDir === true;
}

/**
 * Filters events eligible for merged-folder cleanup.
 *
 * @param events - All scanned events.
 * @returns Events with valid existing outputs or a merged output directory.
 */
export function getCleanupTargetEvents(events: readonly TeslaEvent[]): TeslaEvent[] {
  return events.filter((event) => eventHasExistingOutputs(event) || eventHasMergedOutputDir(event));
}

/**
 * Moves one event's merged output directory to Trash.
 *
 * @param event - Tesla event to clean up.
 * @param outputRootPath - Optional custom output root.
 * @returns Per-event result with success flag and optional error message.
 */
export async function cleanupEventMergedDir(event: TeslaEvent, outputRootPath?: string): Promise<CleanupEventResult> {
  const outputDir = resolveEventOutputDir(event.eventDir, event.sourceRoot, outputRootPath);

  try {
    const exists = await directoryExists(outputDir);
    if (!exists) {
      return { eventDir: event.eventDir, outputDir, success: true };
    }

    await trash(outputDir);
    return { eventDir: event.eventDir, outputDir, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { eventDir: event.eventDir, outputDir, success: false, errorMessage };
  }
}

/**
 * Aggregates per-event cleanup results into a run summary.
 *
 * @param eventResults - Results from each processed event.
 * @returns Run result with success/failure counts and a summary message.
 */
export function buildCleanupRunResult(eventResults: readonly CleanupEventResult[]): CleanupRunResult {
  const succeeded = eventResults.filter((result) => result.success).length;
  const failed = eventResults.length - succeeded;

  return {
    eventResults: [...eventResults],
    succeeded,
    failed,
    summaryMessage: buildCleanupSummaryMessage(succeeded, failed),
  };
}

/**
 * Trashes merged folders for multiple events sequentially.
 *
 * @param events - Events selected for cleanup.
 * @param outputRootPath - Optional custom output root.
 * @returns Aggregated cleanup run result with summary message.
 */
export async function cleanupMergedDirs(
  events: readonly TeslaEvent[],
  outputRootPath?: string,
): Promise<CleanupRunResult> {
  const eventResults: CleanupEventResult[] = [];

  for (const event of events) {
    eventResults.push(await cleanupEventMergedDir(event, outputRootPath));
  }

  return buildCleanupRunResult(eventResults);
}

/**
 * Builds a one-line summary after a cleanup run.
 *
 * @param succeeded - Number of folders successfully trashed.
 * @param failed - Number of failures.
 * @returns Summary string for HUD or completion view.
 */
export function buildCleanupSummaryMessage(succeeded: number, failed: number): string {
  if (failed > 0) {
    return `Removed ${succeeded} merged folder${succeeded !== 1 ? "s" : ""}, ${failed} failed`;
  }

  if (succeeded === 0) {
    return "No merged folders to remove";
  }

  return `Removed ${succeeded} merged folder${succeeded !== 1 ? "s" : ""}`;
}

/**
 * Builds the navigation title during multi-event cleanup.
 *
 * @param completed - Events processed so far.
 * @param total - Total events in the cleanup run.
 * @returns Progress title string.
 */
export function buildCleanupProgressTitle(completed: number, total: number): string {
  if (total <= 1) {
    return "Removing Merged Folder";
  }

  return `Removing Merged Folders (${completed}/${total})`;
}

/**
 * Builds intro markdown for the cleanup complete view.
 *
 * @param result - Completed cleanup run.
 * @returns User-facing intro paragraph.
 */
export function buildCleanupCompleteIntroMarkdown(result: CleanupRunResult): string {
  if (result.failed > 0) {
    return "Some merged folders could not be moved to Trash. Review failed events below and retry if needed.";
  }

  if (result.succeeded === 0) {
    return "No merged folders were found to remove.";
  }

  return `Moved ${result.succeeded} merged folder${result.succeeded !== 1 ? "s" : ""} to Trash. Source split clips were kept.`;
}

/**
 * Confirms bulk removal of merged output folders.
 *
 * @param eventCount - Number of events that will be cleaned up.
 * @returns `true` when the user confirms; `false` when cancelled or count is zero.
 */
export async function confirmCleanupMergedOutputs(eventCount: number): Promise<boolean> {
  if (eventCount === 0) {
    return false;
  }

  return confirmAlert({
    title: "Remove Merged Folders?",
    message: `Move merged output folders for ${eventCount} event${eventCount !== 1 ? "s" : ""} to Trash. Original split clips are not deleted.`,
    primaryAction: { title: "Move to Trash" },
  });
}
