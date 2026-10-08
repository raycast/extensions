/**
 * Pre-merge event categorization, review status, and category detail copy.
 */

import type { TeslaEvent } from "../types";
import { countPlannedMerges, getMergeOutputKey } from "./merge-readiness";

/** Merge review list section identifiers. */
export type MergeEventCategory = "ready" | "partially-merged" | "already-merged" | "timeline-gaps";

/** User-facing review state for categories that require explicit acknowledgment. */
export type MergeCategoryReviewStatus = "ready-to-merge" | "needs-review" | "reviewed";

/** Events grouped by merge readiness and timeline gap presence. */
export type MergeEventCategories = {
  readonly ready: readonly TeslaEvent[];
  readonly partiallyMerged: readonly TeslaEvent[];
  readonly alreadyMerged: readonly TeslaEvent[];
  readonly timelineGaps: readonly TeslaEvent[];
};

/** Counts per merge review category. */
export type MergeCategorySummary = {
  readonly readyCount: number;
  readonly partiallyMergedCount: number;
  readonly alreadyMergedCount: number;
  readonly timelineGapsCount: number;
};

const CATEGORY_LABELS: Record<MergeEventCategory, string> = {
  ready: "Ready to Merge",
  "partially-merged": "Partially Merged",
  "already-merged": "Already Merged",
  "timeline-gaps": "Timeline Gaps",
};

/**
 * Returns the display label for a merge review category.
 *
 * @param category - Category id.
 * @returns Section title for list UI.
 */
export function getMergeCategoryLabel(category: MergeEventCategory): string {
  return CATEGORY_LABELS[category];
}

/**
 * Splits events into merge review categories (an event may appear in timeline-gaps in addition to readiness).
 *
 * @param events - Events with readiness attached.
 * @returns Categorized event arrays.
 */
export function categorizeMergeEvents(events: readonly TeslaEvent[]): MergeEventCategories {
  const ready: TeslaEvent[] = [];
  const partiallyMerged: TeslaEvent[] = [];
  const alreadyMerged: TeslaEvent[] = [];
  const timelineGaps: TeslaEvent[] = [];

  for (const event of events) {
    const existingState = event.readiness?.existingState ?? "none";
    if (existingState === "complete") {
      alreadyMerged.push(event);
    } else if (existingState === "partial") {
      partiallyMerged.push(event);
    } else {
      ready.push(event);
    }

    if (event.totalGaps > 0) {
      timelineGaps.push(event);
    }
  }

  return { ready, partiallyMerged, alreadyMerged, timelineGaps };
}

/**
 * Builds count summary from categorized events.
 *
 * @param categories - Output of {@link categorizeMergeEvents}.
 * @returns Per-category event counts.
 */
export function summarizeMergeCategories(categories: MergeEventCategories): MergeCategorySummary {
  return {
    readyCount: categories.ready.length,
    partiallyMergedCount: categories.partiallyMerged.length,
    alreadyMergedCount: categories.alreadyMerged.length,
    timelineGapsCount: categories.timelineGaps.length,
  };
}

/**
 * Returns the event list for a single category.
 *
 * @param categories - Categorized events.
 * @param category - Category to retrieve.
 * @returns Events in that category.
 */
export function getEventsForCategory(
  categories: MergeEventCategories,
  category: MergeEventCategory,
): readonly TeslaEvent[] {
  switch (category) {
    case "ready":
      return categories.ready;
    case "partially-merged":
      return categories.partiallyMerged;
    case "already-merged":
      return categories.alreadyMerged;
    case "timeline-gaps":
      return categories.timelineGaps;
    default: {
      const _exhaustive: never = category;
      throw new Error(`Unhandled MergeEventCategory: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Returns static markdown explaining a merge review category.
 *
 * @param category - Category id.
 * @returns Detail markdown for the category intro.
 */
export function getCategoryDetailMarkdown(category: MergeEventCategory): string {
  switch (category) {
    case "ready":
      return "Events with new camera outputs to merge. Existing merged files in these events will be skipped unless you enable overwrite in **Already Merged** or the merge plan.";
    case "partially-merged":
      return "Some mergeable cameras already have merged output files while others still need merging. Remaining cameras merge on **Start Merge**; choose overwrites here for cameras that already have outputs.";
    case "already-merged":
      return "All mergeable cameras already have merged output files. Open this section to choose which outputs to overwrite before merging.";
    case "timeline-gaps":
      return "These events have missing clip segments (more than 2 minutes between consecutive files). Merged videos may contain jumps, but merging is still allowed.";
    default: {
      const _exhaustive: never = category;
      throw new Error(`Unhandled MergeEventCategory: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Returns whether a category requires explicit user review before merge.
 *
 * @param category - Category id.
 * @returns `false` only for `ready`; `true` otherwise.
 */
export function categoryNeedsExplicitReview(category: MergeEventCategory): boolean {
  return category !== "ready";
}

/**
 * Computes review badge status for a category given reviewed set state.
 *
 * @param category - Category id.
 * @param reviewedCategories - Categories the user has opened or acknowledged.
 * @returns Review status for list accessories.
 */
export function getCategoryReviewStatus(
  category: MergeEventCategory,
  reviewedCategories: ReadonlySet<MergeEventCategory>,
): MergeCategoryReviewStatus {
  if (category === "ready") {
    return "ready-to-merge";
  }

  if (reviewedCategories.has(category)) {
    return "reviewed";
  }

  return "needs-review";
}

/**
 * Returns a short label for {@link MergeCategoryReviewStatus}.
 *
 * @param status - Review status value.
 * @returns Display label.
 */
export function getCategoryReviewStatusLabel(status: MergeCategoryReviewStatus): string {
  switch (status) {
    case "ready-to-merge":
      return "Ready to merge";
    case "needs-review":
      return "Not reviewed";
    case "reviewed":
      return "Reviewed";
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled MergeCategoryReviewStatus: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Counts existing mergeable outputs selected for overwrite in a category.
 *
 * @param events - Events in the category.
 * @param overwriteKeys - Selected overwrite keys.
 * @returns Number of jobs both existing and marked for overwrite.
 */
export function countCategoryOverwriteSelections(
  events: readonly TeslaEvent[],
  overwriteKeys: ReadonlySet<string>,
): number {
  return events.reduce(
    (count, event) =>
      count +
      (event.readiness?.jobs.filter(
        (job) =>
          job.isMergeable && job.hasExistingOutput && overwriteKeys.has(getMergeOutputKey(event.eventDir, job.camera)),
      ).length ?? 0),
    0,
  );
}

/**
 * Counts camera merges that will run for events in a category given overwrite keys.
 *
 * @param events - Events in the category.
 * @param overwriteKeys - Selected overwrite keys.
 * @returns Planned merge count via {@link countPlannedMerges}.
 */
export function countCategoryPendingOutputs(events: readonly TeslaEvent[], overwriteKeys: ReadonlySet<string>): number {
  return countPlannedMerges(events, overwriteKeys);
}

/**
 * Sums timeline gaps across events in a category.
 *
 * @param events - Events in the category.
 * @returns Total gap count.
 */
export function countCategoryTimelineGaps(events: readonly TeslaEvent[]): number {
  return events.reduce((count, event) => count + event.totalGaps, 0);
}

/**
 * Builds category detail markdown including review status hints.
 *
 * @param category - Category id.
 * @param reviewStatus - Current review status for the category.
 * @returns Combined markdown intro.
 */
export function getCategoryStatusIntroMarkdown(
  category: MergeEventCategory,
  reviewStatus: MergeCategoryReviewStatus,
): string {
  const lines = [getCategoryDetailMarkdown(category)];

  if (reviewStatus === "needs-review") {
    lines.push("", "Open this category to review events and confirm your choices.");
  } else if (reviewStatus === "reviewed" && categoryNeedsExplicitReview(category)) {
    lines.push("", "This category has been reviewed. Adjust overwrite choices any time before merging.");
  }

  return lines.join("\n");
}
