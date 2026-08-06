/**
 * Public library barrel for Tesla Clips.
 *
 * Re-exports:
 * - {@link execFileAsync} — promisified `execFile`
 * - Gap formatting — `formatGapDuration`, `buildGapDetailMarkdown`, `countEventGaps`
 * - Event status UI — `getEventDisplayStatus`, `getEventListIcon`
 * - Errors — `getUserFriendlyMessage`, `isTeslaClipError`
 * - ffmpeg — `resolveFfmpegExecutable`
 * - Merge flow — `confirmDeleteSourceSegments`
 * - Cleanup merged — overview/progress helpers, `cleanupEventMergedDir`, `confirmCleanupMergedOutputs`, targets
 * - Cleanup categories — categorization, labels, markdown intros
 * - Merge categories — categorization, labels, markdown intros
 * - Merge readiness — assessment, overwrite keys, planned merge counts
 * - Logger — `logger`
 * - Paths — `cleanPath`, `resolveFinderSourceRoots`, `resolveMergedOutputFilename`, `validateMergePaths`
 * - Results — `buildSummaryMessage`, `buildTotals`
 * - Status config — `getStatusAppearance`
 */

export { execFileAsync } from "./exec";
export { formatGapDuration, buildGapDetailMarkdown, countEventGaps } from "./gap-format";
export { getEventDisplayStatus, getEventListIcon } from "./event-status";
export { getUserFriendlyMessage, isTeslaClipError } from "./errors";
export { resolveFfmpegExecutable } from "./ffmpeg";
export { confirmDeleteSourceSegments } from "./merge-flow";
export {
  buildCleanupCompleteIntroMarkdown,
  buildCleanupProgressTitle,
  buildCleanupSummaryMessage,
  cleanupEventMergedDir,
  confirmCleanupMergedOutputs,
  eventHasMergedOutputDir,
  getCleanupTargetEvents,
} from "./cleanup-merged";
export {
  buildCleanupEventDetailMarkdown,
  buildCleanupOverviewIntroMarkdown,
  categorizeCleanupEvents,
  getCleanupCategoryLabel,
  summarizeCleanupTargets,
} from "./cleanup-categories";
export {
  categorizeMergeEvents,
  getCategoryDetailMarkdown,
  getEventsForCategory,
  getMergeCategoryLabel,
  summarizeMergeCategories,
} from "./merge-categories";
export {
  assessEventMergeReadiness,
  buildInitialOverwriteKeys,
  countPlannedMerges,
  enrichEventsWithReadiness,
  enrichScanResultWithReadiness,
  eventHasExistingOutputs,
  getMergeOutputKey,
  shouldOverwriteOutput,
} from "./merge-readiness";
export { logger } from "./logger";
export { cleanPath, resolveFinderSourceRoots, resolveMergedOutputFilename, validateMergePaths } from "./paths";
export { buildSummaryMessage, buildTotals } from "./results";
export { getStatusAppearance } from "./status-config";
