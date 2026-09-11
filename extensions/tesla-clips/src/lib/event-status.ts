/**
 * Event list display status and icon resolution during and after merge.
 */

import { Color, Icon } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import type { EventDisplayStatus, EventMergeResult, TeslaEvent } from "../types";

/** Outcome classification shared by list status and in-run progress UI. */
export type MergeOutcome = "merged" | "partial" | "failed" | "skipped";

/**
 * Classifies a completed event's merge outcome from its per-camera output statuses.
 *
 * Shared by {@link getEventDisplayStatus} and `getMergeRunEventStatus` in `merge-progress.ts`.
 *
 * @param result - Completed merge result for one event.
 * @returns `"partial"` when both failures and successes occurred, otherwise the dominant outcome.
 */
export function classifyMergeOutcome(result: EventMergeResult): MergeOutcome {
  const hasFailed = result.outputs.some((output) => output.status === "failed");
  const hasMerged = result.outputs.some((output) => output.status === "merged");

  if (hasFailed && hasMerged) {
    return "partial";
  }

  if (hasFailed) {
    return "failed";
  }

  if (hasMerged) {
    return "merged";
  }

  return "skipped";
}

/**
 * Derives the UI status for an event from merge progress, results, and readiness.
 *
 * @param event - Tesla event being displayed.
 * @param eventStatuses - Completed or in-progress merge results keyed by event id.
 * @param mergingEventId - Id of the event currently merging, if any.
 * @returns Status used for list accessories and filtering.
 */
export function getEventDisplayStatus(
  event: TeslaEvent,
  eventStatuses: Map<string, EventMergeResult>,
  mergingEventId: string | undefined,
): EventDisplayStatus {
  if (mergingEventId === event.id) {
    return "merging";
  }

  const result = eventStatuses.get(event.id);
  if (result) {
    return classifyMergeOutcome(result);
  }

  switch (event.readiness?.existingState) {
    case "complete":
      return "existing";
    case "partial":
      return "existing-partial";
    default:
      return "pending";
  }
}

/**
 * Returns a list row icon for an event display status (independent of {@link getStatusAppearance}).
 *
 * @param status - Computed {@link EventDisplayStatus}.
 * @returns Raycast icon source and tint color.
 */
export function getEventListIcon(status: EventDisplayStatus): { source: Icon; tintColor: Color } {
  if (status === "existing" || status === "skipped" || status === "merged") {
    return { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success };
  }

  if (status === "existing-partial") {
    return { source: Icon.CircleProgress100, tintColor: MODERN_COLORS.warning };
  }

  if (status === "failed") {
    return { source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error };
  }

  if (status === "partial") {
    return { source: Icon.ExclamationMark, tintColor: MODERN_COLORS.warning };
  }

  if (status === "merging") {
    return { source: Icon.CircleProgress25, tintColor: MODERN_COLORS.primary };
  }

  return { source: Icon.Video, tintColor: MODERN_COLORS.primary };
}
