/**
 * `List.Item.Detail.Metadata` panels for events, merge categories, cleanup, and scan stats.
 *
 * @module components/event-detail
 */

import type { ReactElement } from "react";
import { Color, Icon, List } from "@raycast/api";
import { MODERN_COLORS, getCameraDisplayName } from "../constants";
import {
  countCategoryOverwriteSelections,
  countCategoryPendingOutputs,
  countCategoryTimelineGaps,
  getCategoryReviewStatusLabel,
  type MergeCategoryReviewStatus,
  type MergeEventCategory,
} from "../lib/merge-categories";
import {
  estimateEventDurationMinutes,
  findCameraMergeResult,
  formatCameraSummary,
  formatEventTitle,
  formatMergeStatus,
  getCameraIcon,
} from "../lib/format-event";
import { formatGapDuration, formatGapTimestamp } from "../lib/gap-format";
import { countExistingMergeableJobs } from "../lib/merge-readiness";
import { getStatusAppearance } from "../lib/status-config";
import type { EventDisplayStatus, EventMergeResult, ScanResult, TeslaEvent } from "../types";

/** Props for {@link EventDetailMetadata}. */
type EventDetailMetadataProps = {
  readonly event: TeslaEvent;
  readonly result: EventMergeResult | undefined;
  readonly status: EventDisplayStatus;
};

/**
 * Renders metadata for a single recording (status, cameras, gaps, duration).
 *
 * @param props - Event, optional merge result, and display status.
 * @returns `List.Item.Detail.Metadata` side panel content.
 */
export function EventDetailMetadata({ event, result, status }: EventDetailMetadataProps): ReactElement {
  const { label: statusLabel, icon: statusIcon } = getStatusAppearance(status);
  const durationMinutes = estimateEventDurationMinutes(event.totalSegments);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Recorded"
        text={formatEventTitle(event.folderName)}
        icon={{ source: Icon.Clock, tintColor: MODERN_COLORS.primary }}
      />
      <List.Item.Detail.Metadata.Label
        title="Folder"
        text={event.folderName}
        icon={{ source: Icon.Folder, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label title="Status" text={statusLabel} icon={statusIcon} />
      {event.totalGaps > 0 ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Gap Details">
            {event.cameras.flatMap((group) =>
              group.gaps.map((gap) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${group.camera}-${gap.beforeTimestamp}-${gap.afterTimestamp}`}
                  text={`${getCameraDisplayName(group.camera)} · ${formatGapTimestamp(gap.beforeTimestamp)} → ${formatGapTimestamp(gap.afterTimestamp)} · ${formatGapDuration(gap.gapSeconds)}`}
                  color={MODERN_COLORS.warning}
                  icon={{ source: getCameraIcon(group.camera), tintColor: MODERN_COLORS.warning }}
                />
              )),
            )}
          </List.Item.Detail.Metadata.TagList>
        </>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Clips"
        text={`${event.totalSegments} segment${event.totalSegments !== 1 ? "s" : ""}`}
        icon={{ source: Icon.Layers, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label
        title="Cameras"
        text={formatCameraSummary(event.cameras)}
        icon={{ source: Icon.Video, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label
        title="Approx. Duration"
        text={durationMinutes > 0 ? `~${durationMinutes} min` : "< 1 min"}
        icon={{ source: Icon.Clock, tintColor: MODERN_COLORS.neutral }}
      />
      {event.totalGaps > 0 ? (
        <List.Item.Detail.Metadata.Label
          title="Timeline Gaps"
          text={`${event.totalGaps} detected`}
          icon={{ source: Icon.Warning, tintColor: MODERN_COLORS.warning }}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Camera Breakdown">
        {event.cameras.map((group) => {
          const mergeResult = findCameraMergeResult(group.camera, result?.outputs);
          const readinessJob = event.readiness?.jobs.find((job) => job.camera === group.camera);
          const gapNote = group.gaps.length > 0 ? ` · ${group.gaps.length} gap${group.gaps.length > 1 ? "s" : ""}` : "";
          const mergeNote = mergeResult
            ? ` · ${formatMergeStatus(mergeResult.status)}`
            : readinessJob?.hasExistingOutput
              ? " · Already merged"
              : "";
          return (
            <List.Item.Detail.Metadata.TagList.Item
              key={group.camera}
              text={`${getCameraDisplayName(group.camera)} (${group.segments.length})${gapNote}${mergeNote}`}
              color={mergeResult?.status === "failed" ? MODERN_COLORS.error : Color.SecondaryText}
              icon={{ source: getCameraIcon(group.camera), tintColor: MODERN_COLORS.primary }}
            />
          );
        })}
      </List.Item.Detail.Metadata.TagList>
    </List.Item.Detail.Metadata>
  );
}

/** Props for {@link CategoryStatusMetadata}. */
type CategoryStatusMetadataProps = {
  readonly category: MergeEventCategory;
  readonly events: readonly TeslaEvent[];
  readonly overwriteKeys: ReadonlySet<string>;
  readonly reviewStatus: MergeCategoryReviewStatus;
};

function getCategoryReviewStatusIcon(reviewStatus: MergeCategoryReviewStatus): { source: Icon; tintColor: string } {
  switch (reviewStatus) {
    case "ready-to-merge":
      return { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success };
    case "reviewed":
      return { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success };
    case "needs-review":
      return { source: Icon.Circle, tintColor: MODERN_COLORS.warning };
    default: {
      const _exhaustive: never = reviewStatus;
      throw new Error(`Unhandled MergeCategoryReviewStatus: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Renders merge-review category statistics (overwrites, pending outputs, gaps).
 *
 * @param props - Category id, events in category, overwrite keys, and review status.
 * @returns Metadata block for merge category list rows.
 */
export function CategoryStatusMetadata({
  category,
  events,
  overwriteKeys,
  reviewStatus,
}: CategoryStatusMetadataProps): ReactElement {
  const existingJobs = countExistingMergeableJobs(events);
  const overwriteSelected = countCategoryOverwriteSelections(events, overwriteKeys);
  const pendingOutputs = countCategoryPendingOutputs(events, overwriteKeys);
  const timelineGaps = countCategoryTimelineGaps(events);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={getCategoryReviewStatusLabel(reviewStatus)}
        icon={getCategoryReviewStatusIcon(reviewStatus)}
      />
      <List.Item.Detail.Metadata.Label
        title="Events"
        text={`${events.length}`}
        icon={{ source: Icon.List, tintColor: MODERN_COLORS.primary }}
      />
      {category === "partially-merged" || category === "already-merged" ? (
        <>
          <List.Item.Detail.Metadata.Label
            title="Existing Outputs"
            text={`${existingJobs}`}
            icon={{ source: Icon.Document, tintColor: MODERN_COLORS.warning }}
          />
          <List.Item.Detail.Metadata.Label
            title="Set to Overwrite"
            text={`${overwriteSelected}`}
            icon={{ source: Icon.ArrowCounterClockwise, tintColor: MODERN_COLORS.warning }}
          />
          <List.Item.Detail.Metadata.Label
            title="Set to Skip"
            text={`${existingJobs - overwriteSelected}`}
            icon={{ source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }}
          />
        </>
      ) : null}
      {category === "partially-merged" || category === "ready" ? (
        <List.Item.Detail.Metadata.Label
          title="Outputs to Merge"
          text={`${pendingOutputs}`}
          icon={{ source: Icon.Layers, tintColor: MODERN_COLORS.primary }}
        />
      ) : null}
      {category === "timeline-gaps" ? (
        <List.Item.Detail.Metadata.Label
          title="Timeline Gaps"
          text={`${timelineGaps} detected`}
          icon={{ source: Icon.Warning, tintColor: MODERN_COLORS.warning }}
        />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

/** Props for {@link CleanupOverviewMetadata}. */
type CleanupOverviewMetadataProps = {
  readonly summary: import("../lib/cleanup-categories").CleanupTargetSummary;
};

/**
 * Renders cleanup target counts (fully/partially merged, invalid outputs).
 *
 * @param props - Aggregated cleanup summary from {@link summarizeCleanupTargets}.
 * @returns Metadata for the removal overview summary row.
 */
export function CleanupOverviewMetadata({ summary }: CleanupOverviewMetadataProps): ReactElement {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Events"
        text={`${summary.eventCount}`}
        icon={{ source: Icon.List, tintColor: MODERN_COLORS.primary }}
      />
      <List.Item.Detail.Metadata.Label
        title="Fully Merged"
        text={`${summary.fullyMergedCount}`}
        icon={{ source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }}
      />
      <List.Item.Detail.Metadata.Label
        title="Partially Merged"
        text={`${summary.partiallyMergedCount}`}
        icon={{ source: Icon.CircleProgress100, tintColor: MODERN_COLORS.warning }}
      />
      {summary.invalidOutputsCount > 0 ? (
        <List.Item.Detail.Metadata.Label
          title="Invalid Outputs Only"
          text={`${summary.invalidOutputsCount}`}
          icon={{ source: Icon.ExclamationMark, tintColor: MODERN_COLORS.error }}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Valid Merged Files"
        text={`${summary.validOutputCount}`}
        icon={{ source: Icon.Document, tintColor: MODERN_COLORS.neutral }}
      />
      {summary.invalidFileCount > 0 ? (
        <List.Item.Detail.Metadata.Label
          title="Invalid Files"
          text={`${summary.invalidFileCount}`}
          icon={{ source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error }}
        />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title="Source Clips"
        text="Kept"
        icon={{ source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }}
      />
    </List.Item.Detail.Metadata>
  );
}

/** Props for {@link ScanOverviewMetadata}. */
type ScanOverviewMetadataProps = {
  readonly scanSummary: ScanResult;
};

/**
 * Renders high-level scan totals (events, segments, gaps, existing merges).
 *
 * @param props - Combined scan result from {@link useClipScanner}.
 * @returns Metadata for the scan overview list section.
 */
export function ScanOverviewMetadata({ scanSummary }: ScanOverviewMetadataProps): ReactElement {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Events"
        text={`${scanSummary.totalEvents}`}
        icon={{ source: Icon.List, tintColor: MODERN_COLORS.primary }}
      />
      <List.Item.Detail.Metadata.Label
        title="Camera Groups"
        text={`${scanSummary.totalCameras}`}
        icon={{ source: Icon.Video, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label
        title="Clip Segments"
        text={`${scanSummary.totalSegments}`}
        icon={{ source: Icon.Layers, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label
        title="Timeline Gaps"
        text={scanSummary.totalGaps > 0 ? `${scanSummary.totalGaps} detected` : "None"}
        icon={{
          source: scanSummary.totalGaps > 0 ? Icon.Warning : Icon.CheckCircle,
          tintColor: scanSummary.totalGaps > 0 ? MODERN_COLORS.warning : MODERN_COLORS.success,
        }}
      />
      {(scanSummary.totalExistingEvents ?? 0) > 0 || (scanSummary.totalPartialExistingEvents ?? 0) > 0 ? (
        <List.Item.Detail.Metadata.Label
          title="Existing Merges"
          text={`${scanSummary.totalExistingEvents ?? 0} complete · ${scanSummary.totalPartialExistingEvents ?? 0} partial`}
          icon={{ source: Icon.Document, tintColor: MODERN_COLORS.warning }}
        />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}
