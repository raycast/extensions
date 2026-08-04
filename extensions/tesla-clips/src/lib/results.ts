/**
 * Aggregate merge run statistics and human-readable summary strings.
 */

import type { RootMergeResult, Totals } from "../types";

/**
 * Sums per-root merge counters into a single {@link Totals} object.
 *
 * @param results - Merge results for each scanned source root.
 * @returns Aggregated counts across all roots.
 */
export function buildTotals(results: RootMergeResult[]): Totals {
  return results.reduce<Totals>(
    (acc, result) => ({
      roots: acc.roots + 1,
      eventsScanned: acc.eventsScanned + result.eventsScanned,
      eventsWithClips: acc.eventsWithClips + result.eventsWithClips,
      cameraJobs: acc.cameraJobs + result.cameraJobs,
      merged: acc.merged + result.merged,
      skippedSingle: acc.skippedSingle + result.skippedSingle,
      skippedExisting: acc.skippedExisting + result.skippedExisting,
      failed: acc.failed + result.failed,
    }),
    {
      roots: 0,
      eventsScanned: 0,
      eventsWithClips: 0,
      cameraJobs: 0,
      merged: 0,
      skippedSingle: 0,
      skippedExisting: 0,
      failed: 0,
    },
  );
}

/**
 * Builds a one-line summary for merge completion UI.
 *
 * @param totals - Aggregated merge counters.
 * @returns Bullet-separated summary (events, merged, skipped, failed).
 */
export function buildSummaryMessage(totals: Totals): string {
  return [
    `${totals.eventsWithClips}/${totals.eventsScanned} event folders with clips`,
    `${totals.merged} merged`,
    `${totals.skippedExisting} existing skipped`,
    `${totals.skippedSingle} single-segment skipped`,
    `${totals.failed} failed`,
  ].join(" \u2022 ");
}
