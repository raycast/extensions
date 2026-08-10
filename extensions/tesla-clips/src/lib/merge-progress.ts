/**
 * In-run merge progress UI: per-event status, counts, and completion copy.
 */

import { Color, Icon } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { classifyMergeOutcome } from "./event-status";
import type { CameraMergeResult, EventMergeResult, MergeRunResult, Totals } from "../types";

/** Per-event status during an active multi-event merge run. */
export type MergeRunEventStatus = "waiting" | "merging" | "merged" | "skipped" | "failed" | "partial";

/**
 * Resolves run-level status for one event from the active merge id and completed results.
 *
 * @param eventId - Tesla event id.
 * @param eventStatuses - Map of completed merge results by event id.
 * @param mergingEventId - Id of the event currently merging, if any.
 * @returns Run status for list progress UI.
 */
export function getMergeRunEventStatus(
  eventId: string,
  eventStatuses: ReadonlyMap<string, EventMergeResult>,
  mergingEventId: string | undefined,
): MergeRunEventStatus {
  if (mergingEventId === eventId) {
    return "merging";
  }

  const result = eventStatuses.get(eventId);
  if (!result) {
    return "waiting";
  }

  return classifyMergeOutcome(result);
}

/**
 * Returns list icon for a {@link MergeRunEventStatus}.
 *
 * @param status - Run-level event status.
 * @returns Raycast icon source and tint.
 */
export function getMergeRunEventIcon(status: MergeRunEventStatus): { source: Icon; tintColor: Color } {
  switch (status) {
    case "waiting":
      return { source: Icon.Circle, tintColor: MODERN_COLORS.neutral };
    case "merging":
      return { source: Icon.CircleProgress, tintColor: MODERN_COLORS.primary };
    case "merged":
      return { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success };
    case "skipped":
      return { source: Icon.MinusCircle, tintColor: MODERN_COLORS.neutral };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error };
    case "partial":
      return { source: Icon.ExclamationMark, tintColor: MODERN_COLORS.warning };
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled MergeRunEventStatus: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Returns a short label for a {@link MergeRunEventStatus}.
 *
 * @param status - Run-level event status.
 * @returns Display label for list accessories.
 */
export function getMergeRunEventLabel(status: MergeRunEventStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "merging":
      return "Merging";
    case "merged":
      return "Merged";
    case "skipped":
      return "Skipped";
    case "failed":
      return "Failed";
    case "partial":
      return "Partial";
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled MergeRunEventStatus: ${String(_exhaustive)}`);
    }
  }
}

/** Per-camera outcome counts for one completed event merge. */
export type EventMergeCounts = {
  readonly merged: number;
  readonly skippedExisting: number;
  readonly skippedSingle: number;
  readonly failed: number;
};

/**
 * Aggregates per-camera merge results into count buckets.
 *
 * @param outputs - Camera merge results for one event.
 * @returns Counts by outcome status.
 */
export function countEventMergeResults(outputs: readonly CameraMergeResult[]): EventMergeCounts {
  return outputs.reduce<EventMergeCounts>(
    (counts, output) => {
      switch (output.status) {
        case "merged":
          return { ...counts, merged: counts.merged + 1 };
        case "skipped-existing":
          return { ...counts, skippedExisting: counts.skippedExisting + 1 };
        case "skipped-single":
          return { ...counts, skippedSingle: counts.skippedSingle + 1 };
        case "failed":
          return { ...counts, failed: counts.failed + 1 };
        default: {
          const _exhaustive: never = output.status;
          throw new Error(`Unhandled CameraMergeStatus: ${String(_exhaustive)}`);
        }
      }
    },
    { merged: 0, skippedExisting: 0, skippedSingle: 0, failed: 0 },
  );
}

/**
 * Builds a one-line subtitle summarizing an event's merge outcomes.
 *
 * @param result - Completed merge result for one event.
 * @returns Middle-dot-separated summary or `No changes`.
 */
export function summarizeEventMergeResult(result: EventMergeResult): string {
  const counts = countEventMergeResults(result.outputs);
  const parts: string[] = [];

  if (counts.merged > 0) {
    parts.push(`${counts.merged} merged`);
  }
  if (counts.skippedExisting > 0) {
    parts.push(`${counts.skippedExisting} skipped`);
  }
  if (counts.skippedSingle > 0) {
    parts.push(`${counts.skippedSingle} single`);
  }
  if (counts.failed > 0) {
    parts.push(`${counts.failed} failed`);
  }

  return parts.length > 0 ? parts.join(" · ") : "No changes";
}

/**
 * Builds the navigation title during a multi-event merge.
 *
 * @param completed - Events finished so far.
 * @param total - Total events in the run.
 * @returns Progress title string.
 */
export function buildMergeProgressTitle(completed: number, total: number): string {
  if (total <= 1) {
    return "Merging Event";
  }

  return `Merging Events (${completed}/${total})`;
}

/**
 * Builds intro markdown for the merge complete view.
 *
 * @param totals - Aggregated merge counters for the run.
 * @param hasFailures - Whether any camera merge failed.
 * @returns User-facing intro paragraph.
 */
export function buildMergeCompleteIntroMarkdown(totals: Totals, hasFailures: boolean): string {
  if (hasFailures) {
    return "Merge finished with errors. Review failed outputs below and retry with overwrite enabled if needed.";
  }

  if (totals.merged === 0 && totals.skippedExisting > 0) {
    return "No new outputs were merged. Existing files were kept unless you enabled overwrite.";
  }

  if (totals.merged === 0) {
    return "Nothing new to merge. All camera outputs were already up to date or single-segment.";
  }

  return `Successfully merged ${totals.merged} camera output${totals.merged !== 1 ? "s" : ""}.`;
}

/**
 * Returns the failed camera job count from a merge run result.
 *
 * @param result - Completed merge run with totals.
 * @returns `result.totals.failed`.
 */
export function getMergeRunFailureCount(result: MergeRunResult): number {
  return result.totals.failed;
}
