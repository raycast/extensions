/**
 * Shared merge-review helpers: markdown builders, accessories, and bulk actions.
 *
 * @module components/merge-section-shared
 */

import type { ReactElement } from "react";
import { Action, Icon } from "@raycast/api";
import { MODERN_COLORS, getCameraDisplayName } from "../constants";
import { countEventGaps } from "../lib/gap-format";
import { formatEventTitle } from "../lib/format-event";
import {
  countExistingMergeableJobs,
  showCameraOverwriteFeedback,
  showOverwriteScopeFeedback,
} from "../lib/merge-review-feedback";
import type { MergeEventCategory, MergeCategoryReviewStatus } from "../lib/merge-categories";
import { getMergeOutputKey } from "../lib/merge-readiness";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import type { TeslaEvent } from "../types";

function countEventOverwriteSelections(event: TeslaEvent, overwriteKeys: ReadonlySet<string>): number {
  return (event.readiness?.jobs ?? []).filter(
    (job) =>
      job.isMergeable && job.hasExistingOutput && overwriteKeys.has(getMergeOutputKey(event.eventDir, job.camera)),
  ).length;
}

function countEventExistingJobs(event: TeslaEvent): number {
  return event.readiness?.jobs.filter((job) => job.isMergeable && job.hasExistingOutput).length ?? 0;
}

/**
 * Builds detail markdown listing existing outputs and overwrite/skip state.
 *
 * @param event - Event with readiness jobs.
 * @param overwriteKeys - Selected output keys to overwrite.
 * @returns Markdown string for list item detail.
 */
export function buildAlreadyMergedDetailMarkdown(event: TeslaEvent, overwriteKeys: ReadonlySet<string>): string {
  const lines = [`### ${formatEventTitle(event.folderName)}`, "", "Choose which existing outputs to overwrite:"];

  for (const job of event.readiness?.jobs ?? []) {
    if (!job.isMergeable || !job.hasExistingOutput) {
      continue;
    }

    const willOverwrite = overwriteKeys.has(getMergeOutputKey(event.eventDir, job.camera));
    lines.push(
      `- **${getCameraDisplayName(job.camera)}** · \`${job.outputFilename}\` · ${willOverwrite ? "Overwrite" : "Skip"}`,
    );
  }

  return lines.join("\n");
}

/**
 * Builds detail markdown for partially merged events (existing + pending cameras).
 *
 * @param event - Event with readiness jobs.
 * @param overwriteKeys - Selected output keys to overwrite.
 * @returns Markdown string for list item detail.
 */
export function buildPartiallyMergedDetailMarkdown(event: TeslaEvent, overwriteKeys: ReadonlySet<string>): string {
  const readiness = event.readiness;
  const lines = [
    `### ${formatEventTitle(event.folderName)}`,
    "",
    `${readiness?.existingOutputCount ?? 0} of ${readiness?.mergeableCount ?? 0} mergeable cameras already have outputs.`,
    "",
  ];

  for (const job of readiness?.jobs ?? []) {
    if (!job.isMergeable) {
      continue;
    }

    if (job.hasExistingOutput) {
      const willOverwrite = overwriteKeys.has(getMergeOutputKey(event.eventDir, job.camera));
      lines.push(`- **${getCameraDisplayName(job.camera)}** · existing · ${willOverwrite ? "Overwrite" : "Skip"}`);
      continue;
    }

    const segmentLabel = job.segmentCount === 1 ? "segment" : "segments";
    lines.push(`- **${getCameraDisplayName(job.camera)}** · ${job.segmentCount} ${segmentLabel} · Will merge`);
  }

  return lines.join("\n");
}

/**
 * Builds per-camera toggle actions for existing outputs on one event.
 *
 * @param event - Event whose mergeable jobs are listed.
 * @param review - Merge review store for toggles.
 * @param overwriteKeys - Current overwrite selection set.
 * @returns Array of Raycast `Action` elements.
 */
export function buildOverwriteActions(
  event: TeslaEvent,
  review: MergeReviewStore,
  overwriteKeys: ReadonlySet<string>,
): ReactElement[] {
  return (event.readiness?.jobs ?? [])
    .filter((job) => job.isMergeable && job.hasExistingOutput)
    .map((job) => {
      const key = getMergeOutputKey(event.eventDir, job.camera);
      const willOverwrite = overwriteKeys.has(key);
      return (
        <Action
          key={key}
          title={
            willOverwrite ? `Skip ${getCameraDisplayName(job.camera)}` : `Overwrite ${getCameraDisplayName(job.camera)}`
          }
          icon={willOverwrite ? Icon.CheckCircle : Icon.ArrowCounterClockwise}
          onAction={() => {
            review.toggleOverwrite(event.eventDir, job.camera);
            void showCameraOverwriteFeedback(event, job.camera, overwriteKeys);
          }}
        />
      );
    });
}

/**
 * Whether a merge category supports bulk overwrite/skip actions.
 *
 * @param category - Merge review category id.
 * @returns `true` for `already-merged` and `partially-merged`.
 */
export function categorySupportsBulkOverwrite(category: MergeEventCategory): boolean {
  return category === "already-merged" || category === "partially-merged";
}

/**
 * Builds overwrite-all and skip-all actions scoped to a category's events.
 *
 * @param category - Merge review category.
 * @param events - Events in that category.
 * @param review - Merge review store.
 * @returns Raycast actions, or empty if category has no bulk overwrite support.
 */
export function buildCategoryBulkActions(
  category: MergeEventCategory,
  events: readonly TeslaEvent[],
  review: MergeReviewStore,
): ReactElement[] {
  if (!categorySupportsBulkOverwrite(category)) {
    return [];
  }

  return [
    <Action
      key="overwrite-category"
      title="Overwrite All in Category"
      icon={Icon.ArrowCounterClockwise}
      onAction={() => {
        const outputCount = countExistingMergeableJobs(events);
        review.toggleEventsOverwrites(events, true);
        review.markCategoryReviewed(category);
        void showOverwriteScopeFeedback(true, outputCount, "category");
      }}
    />,
    <Action
      key="skip-category"
      title="Skip All in Category"
      icon={Icon.CheckCircle}
      onAction={() => {
        const outputCount = countExistingMergeableJobs(events);
        review.toggleEventsOverwrites(events, false);
        review.markCategoryReviewed(category);
        void showOverwriteScopeFeedback(false, outputCount, "category");
      }}
    />,
  ];
}

/**
 * List row accessory reflecting whether a category has been reviewed.
 *
 * @param status - Category review status from merge categories helper.
 * @returns Icon and tooltip for list accessories.
 */
export function getCategoryReviewListAccessory(status: MergeCategoryReviewStatus): {
  icon: { source: Icon; tintColor: string };
  tooltip: string;
} {
  switch (status) {
    case "ready-to-merge":
      return {
        icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success },
        tooltip: "Ready to merge",
      };
    case "reviewed":
      return {
        icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success },
        tooltip: "Reviewed",
      };
    case "needs-review":
      return {
        icon: { source: Icon.Circle, tintColor: MODERN_COLORS.warning },
        tooltip: "Not reviewed",
      };
  }
}

/**
 * List row accessory for an event within a merge category section.
 *
 * @param category - Active merge category.
 * @param event - Event row.
 * @param overwriteKeys - Current overwrite selections.
 * @returns Icon and tooltip for list accessories.
 */
export function getSectionAccessory(
  category: MergeEventCategory,
  event: TeslaEvent,
  overwriteKeys: ReadonlySet<string>,
): { icon: { source: Icon; tintColor: string }; tooltip: string } {
  if (category === "already-merged") {
    const existingJobs = countEventExistingJobs(event);
    const selectedOverwrites = countEventOverwriteSelections(event, overwriteKeys);
    return {
      icon:
        selectedOverwrites > 0
          ? { source: Icon.ArrowCounterClockwise, tintColor: MODERN_COLORS.warning }
          : { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success },
      tooltip:
        selectedOverwrites > 0
          ? `${selectedOverwrites} set to overwrite`
          : `${existingJobs} existing outputs will be skipped`,
    };
  }

  if (category === "partially-merged") {
    const existingJobs = countEventExistingJobs(event);
    const pendingJobs = event.readiness?.pendingMergeCount ?? 0;
    const selectedOverwrites = countEventOverwriteSelections(event, overwriteKeys);
    return {
      icon: { source: Icon.CircleProgress100, tintColor: MODERN_COLORS.warning },
      tooltip:
        selectedOverwrites > 0
          ? `${pendingJobs} pending · ${selectedOverwrites} overwrite${selectedOverwrites !== 1 ? "s" : ""}`
          : `${existingJobs} merged · ${pendingJobs} pending`,
    };
  }

  if (category === "timeline-gaps") {
    const gapCount = countEventGaps(event);
    return {
      icon: { source: Icon.Warning, tintColor: MODERN_COLORS.warning },
      tooltip: `${gapCount} gap${gapCount !== 1 ? "s" : ""}`,
    };
  }

  return {
    icon: { source: Icon.ChevronRight, tintColor: MODERN_COLORS.neutral },
    tooltip: "View details",
  };
}

/**
 * List row accessory for a day group within a merge category.
 *
 * @param category - Active merge category.
 * @param dayGroup - Day aggregate with gap and event counts.
 * @returns Icon and tooltip for list accessories.
 */
export function getDaySectionAccessory(
  category: MergeEventCategory,
  dayGroup: { readonly totalGaps: number; readonly eventCount: number },
): { icon: { source: Icon; tintColor: string }; tooltip: string } {
  if (category === "timeline-gaps" && dayGroup.totalGaps > 0) {
    return {
      icon: { source: Icon.Warning, tintColor: MODERN_COLORS.warning },
      tooltip: `${dayGroup.totalGaps} gap${dayGroup.totalGaps !== 1 ? "s" : ""}`,
    };
  }

  return {
    icon: { source: Icon.ChevronRight, tintColor: MODERN_COLORS.neutral },
    tooltip: `${dayGroup.eventCount} recording${dayGroup.eventCount !== 1 ? "s" : ""}`,
  };
}
