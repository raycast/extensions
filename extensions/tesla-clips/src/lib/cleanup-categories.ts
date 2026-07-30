/**
 * Cleanup target categorization, summaries, and detail markdown.
 */

import type { TeslaEvent } from "../types";
import { resolveEventOutputDir } from "./paths";

/** Cleanup review list section identifiers. */
export type CleanupEventCategory = "fully-merged" | "partially-merged" | "invalid-outputs";

/** Events grouped by merged output completeness. */
export type CleanupEventCategories = {
  readonly fullyMerged: readonly TeslaEvent[];
  readonly partiallyMerged: readonly TeslaEvent[];
  readonly invalidOutputs: readonly TeslaEvent[];
};

/** Rolled-up counts for cleanup overview UI. */
export type CleanupTargetSummary = {
  readonly eventCount: number;
  readonly fullyMergedCount: number;
  readonly partiallyMergedCount: number;
  readonly invalidOutputsCount: number;
  readonly validOutputCount: number;
  readonly invalidFileCount: number;
};

const CATEGORY_LABELS: Record<CleanupEventCategory, string> = {
  "fully-merged": "Fully Merged",
  "partially-merged": "Partially Merged",
  "invalid-outputs": "Invalid Outputs Only",
};

/**
 * Returns the display label for a cleanup category.
 *
 * @param category - Category id.
 * @returns Section title for list UI.
 */
export function getCleanupCategoryLabel(category: CleanupEventCategory): string {
  return CATEGORY_LABELS[category];
}

/**
 * Splits cleanup target events by merged output state.
 *
 * @param events - Events eligible for cleanup (with readiness).
 * @returns Categorized event arrays.
 */
export function categorizeCleanupEvents(events: readonly TeslaEvent[]): CleanupEventCategories {
  const fullyMerged: TeslaEvent[] = [];
  const partiallyMerged: TeslaEvent[] = [];
  const invalidOutputs: TeslaEvent[] = [];

  for (const event of events) {
    const existingState = event.readiness?.existingState ?? "none";

    if (existingState === "complete") {
      fullyMerged.push(event);
      continue;
    }

    if (existingState === "partial") {
      partiallyMerged.push(event);
      continue;
    }

    if (event.readiness?.hasMergedOutputDir) {
      invalidOutputs.push(event);
    }
  }

  return { fullyMerged, partiallyMerged, invalidOutputs };
}

/**
 * Returns the event list for a single cleanup category.
 *
 * @param categories - Categorized events.
 * @param category - Category to retrieve.
 * @returns Events in that category.
 */
export function getEventsForCleanupCategory(
  categories: CleanupEventCategories,
  category: CleanupEventCategory,
): readonly TeslaEvent[] {
  switch (category) {
    case "fully-merged":
      return categories.fullyMerged;
    case "partially-merged":
      return categories.partiallyMerged;
    case "invalid-outputs":
      return categories.invalidOutputs;
    default: {
      const _exhaustive: never = category;
      throw new Error(`Unhandled CleanupEventCategory: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Builds aggregate cleanup statistics across all target events.
 *
 * @param events - Cleanup target events.
 * @returns Summary counts for overview markdown.
 */
export function summarizeCleanupTargets(events: readonly TeslaEvent[]): CleanupTargetSummary {
  const categories = categorizeCleanupEvents(events);
  let validOutputCount = 0;
  let invalidFileCount = 0;

  for (const event of events) {
    validOutputCount += event.readiness?.existingOutputCount ?? 0;
    const mergedFiles = event.readiness?.mergedOutputFileCount ?? 0;
    const validFiles = event.readiness?.existingOutputCount ?? 0;
    invalidFileCount += Math.max(0, mergedFiles - validFiles);
  }

  return {
    eventCount: events.length,
    fullyMergedCount: categories.fullyMerged.length,
    partiallyMergedCount: categories.partiallyMerged.length,
    invalidOutputsCount: categories.invalidOutputs.length,
    validOutputCount,
    invalidFileCount,
  };
}

/**
 * Returns static markdown explaining a cleanup category.
 *
 * @param category - Category id.
 * @returns Detail markdown for the category intro.
 */
export function getCleanupCategoryIntroMarkdown(category: CleanupEventCategory): string {
  switch (category) {
    case "fully-merged":
      return "Every mergeable camera has a valid merged output. Removing will trash the entire merged folder for these events.";
    case "partially-merged":
      return "Some cameras have valid merged outputs while others do not. Removing will trash the merged folder, including valid and invalid files.";
    case "invalid-outputs":
      return "Merged folders contain invalid or corrupt output files only. Removing will trash these stub folders so you can merge again.";
    default: {
      const _exhaustive: never = category;
      throw new Error(`Unhandled CleanupEventCategory: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Resolves the merged output directory path for cleanup UI.
 *
 * @param event - Tesla event.
 * @param outputRootPath - Optional custom output root.
 * @returns Absolute merged folder path.
 */
export function resolveCleanupOutputDir(event: TeslaEvent, outputRootPath?: string): string {
  return resolveEventOutputDir(event.eventDir, event.sourceRoot, outputRootPath);
}

/**
 * Counts MP4 files in the merged folder that fail validity checks.
 *
 * @param event - Event with readiness metadata.
 * @returns `mergedOutputFileCount - existingOutputCount`, minimum zero.
 */
export function countInvalidMergedFiles(event: TeslaEvent): number {
  const mergedFiles = event.readiness?.mergedOutputFileCount ?? 0;
  const validFiles = event.readiness?.existingOutputCount ?? 0;
  return Math.max(0, mergedFiles - validFiles);
}

/**
 * Builds overview markdown for the cleanup confirmation screen.
 *
 * @param summary - Aggregate cleanup statistics.
 * @returns Markdown intro for the cleanup flow.
 */
export function buildCleanupOverviewIntroMarkdown(summary: CleanupTargetSummary): string {
  return [
    `**${summary.eventCount}** event${summary.eventCount !== 1 ? "s" : ""} with merged output folders will be moved to Trash.`,
    "",
    `- **${summary.fullyMergedCount}** fully merged`,
    `- **${summary.partiallyMergedCount}** partially merged`,
    summary.invalidOutputsCount > 0 ? `- **${summary.invalidOutputsCount}** with invalid outputs only` : null,
    "",
    `${summary.validOutputCount} valid merged file${summary.validOutputCount !== 1 ? "s" : ""} detected${summary.invalidFileCount > 0 ? ` · ${summary.invalidFileCount} invalid` : ""}.`,
    "",
    "Original split clips are **not** deleted.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Builds per-event detail markdown for cleanup review.
 *
 * @param event - Tesla event to describe.
 * @param outputRootPath - Optional custom output root.
 * @returns Markdown with paths, file counts, and camera status.
 */
export function buildCleanupEventDetailMarkdown(event: TeslaEvent, outputRootPath?: string): string {
  const outputDir = resolveCleanupOutputDir(event, outputRootPath);
  const validCount = event.readiness?.existingOutputCount ?? 0;
  const invalidCount = countInvalidMergedFiles(event);
  const totalFiles = event.readiness?.mergedOutputFileCount ?? 0;

  const cameraLines =
    event.readiness?.jobs
      .filter((job) => job.hasExistingOutput || totalFiles > 0)
      .map((job) => {
        const status = job.hasExistingOutput ? "valid merged output" : "no valid output";
        return `- **${job.camera}** · ${status}\n  \`${job.outputPath}\``;
      }) ?? [];

  return [
    `### ${event.folderName}`,
    "",
    `**Merged folder**`,
    `\`${outputDir}\``,
    "",
    `**Files in folder:** ${totalFiles} · **Valid:** ${validCount}${invalidCount > 0 ? ` · **Invalid:** ${invalidCount}` : ""}`,
    "",
    cameraLines.length > 0 ? "**Camera outputs**" : null,
    ...cameraLines,
    "",
    "The entire merged folder for this event will be moved to Trash.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
