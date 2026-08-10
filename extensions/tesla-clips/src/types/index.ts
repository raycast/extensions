/**
 * Shared domain types for Tesla dashcam clip scanning, merging, and cleanup.
 *
 * @module types
 */

/** Outcome of merging a single camera angle for one event. */
export type CameraMergeStatus = "merged" | "skipped-single" | "skipped-existing" | "failed";

/** One parsed `.mp4` segment belonging to an event and camera. */
export type ClipSegment = {
  readonly timestamp: string;
  readonly camera: string;
  readonly filePath: string;
};

/** Parsed timestamp and camera from a clip filename. */
export type ClipParseResult = {
  readonly timestamp: string;
  readonly camera: string;
};

/** Gap between consecutive segment timestamps on one camera timeline. */
export type GapInfo = {
  readonly beforeTimestamp: string;
  readonly afterTimestamp: string;
  readonly gapSeconds: number;
};

/** Segments and detected gaps for one camera within an event. */
export type CameraGroup = {
  readonly camera: string;
  readonly segments: ClipSegment[];
  readonly gaps: GapInfo[];
};

/** How completely merged outputs already exist for an event. */
export type EventExistingState = "none" | "partial" | "complete";

/** Per-camera merge job metadata used during merge review. */
export type MergeReadinessJob = {
  readonly camera: string;
  readonly outputPath: string;
  readonly outputFilename: string;
  readonly segmentCount: number;
  readonly hasExistingOutput: boolean;
  readonly isMergeable: boolean;
};

/** Aggregate merge readiness for all cameras on one event. */
export type EventMergeReadiness = {
  readonly existingState: EventExistingState;
  readonly existingOutputCount: number;
  readonly mergeableCount: number;
  readonly pendingMergeCount: number;
  readonly hasMergedOutputDir?: boolean;
  readonly mergedOutputFileCount?: number;
  readonly jobs: readonly MergeReadinessJob[];
};

/** A Tesla clip event folder with cameras, segments, and optional readiness. */
export type TeslaEvent = {
  readonly id: string;
  readonly eventDir: string;
  readonly sourceRoot: string;
  readonly folderName: string;
  readonly cameras: CameraGroup[];
  readonly totalSegments: number;
  readonly totalGaps: number;
  readonly readiness?: EventMergeReadiness;
};

/** Aggregated scan statistics across one or more source roots. */
export type ScanResult = {
  readonly events: TeslaEvent[];
  readonly totalEvents: number;
  readonly totalCameras: number;
  readonly totalSegments: number;
  readonly totalGaps: number;
  readonly totalExistingEvents?: number;
  readonly totalPartialExistingEvents?: number;
};

/** Merge result for one camera output file. */
export type CameraMergeResult = {
  readonly camera: string;
  readonly outputPath: string;
  readonly segmentCount: number;
  readonly status: CameraMergeStatus;
  readonly errorMessage?: string;
};

/** Merge results for all cameras on one event. */
export type EventMergeResult = {
  readonly eventDir: string;
  readonly outputs: CameraMergeResult[];
};

/** Roll-up merge statistics for a single source root. */
export type RootMergeResult = {
  readonly sourceRoot: string;
  readonly outputBase: string;
  readonly eventsScanned: number;
  readonly eventsWithClips: number;
  readonly cameraJobs: number;
  readonly merged: number;
  readonly skippedSingle: number;
  readonly skippedExisting: number;
  readonly failed: number;
  readonly eventResults: EventMergeResult[];
};

/** User preferences and runtime flags passed into merge operations. */
export type MergeOptions = {
  readonly ffmpegPath: string;
  readonly outputRootPath?: string;
  readonly overwriteExisting: boolean;
  readonly overwriteOutputs?: ReadonlySet<string>;
  readonly deleteSourceSegmentsAfterMerge: boolean;
};

/** Cross-root totals after a batch merge run. */
export type Totals = {
  readonly roots: number;
  readonly eventsScanned: number;
  readonly eventsWithClips: number;
  readonly cameraJobs: number;
  readonly merged: number;
  readonly skippedSingle: number;
  readonly skippedExisting: number;
  readonly failed: number;
};

/** Final payload returned when merging multiple events. */
export type MergeRunResult = {
  readonly results: RootMergeResult[];
  readonly totals: Totals;
  readonly summaryMessage: string;
};

/** Result of removing merged output folders for one event. */
export type CleanupEventResult = {
  readonly eventDir: string;
  readonly outputDir: string;
  readonly success: boolean;
  readonly errorMessage?: string;
};

/** Aggregated cleanup run outcome across selected events. */
export type CleanupRunResult = {
  readonly eventResults: readonly CleanupEventResult[];
  readonly succeeded: number;
  readonly failed: number;
  readonly summaryMessage: string;
};

/** UI display status for an event in lists and detail panes. */
export type EventDisplayStatus =
  | "pending"
  | "existing"
  | "existing-partial"
  | "merging"
  | "merged"
  | "skipped"
  | "partial"
  | "failed";
