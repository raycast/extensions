/**
 * Per-day merge plan: one list section per event with per-camera overwrite toggles.
 *
 * @module components/merge-plan-day
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { MODERN_COLORS, getCameraDisplayName } from "../constants";
import { formatEventTimeLabel, type EventDayGroup } from "../lib/event-day-groups";
import { formatEventTitle } from "../lib/format-event";
import { showCameraOverwriteFeedback } from "../lib/merge-review-feedback";
import { getMergeOutputKey } from "../lib/merge-readiness";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { useMergeReviewSnapshot } from "../hooks/use-merge-review-state";
import type { TeslaEvent } from "../types";
import { buildGlobalMergeReviewActions } from "./merge-section-shared";

/** Props for {@link MergePlanDay}. */
type MergePlanDayProps = {
  readonly dayGroup: EventDayGroup;
  readonly review: MergeReviewStore;
  readonly canMerge: boolean;
};

function getJobActionLabel(job: NonNullable<TeslaEvent["readiness"]>["jobs"][number], willOverwrite: boolean): string {
  if (!job.isMergeable) {
    return "Single clip";
  }

  if (!job.hasExistingOutput) {
    return "Merge";
  }

  return willOverwrite ? "Overwrite" : "Skip";
}

/**
 * Renders camera jobs for each event on a day with merge/skip/overwrite actions.
 *
 * @param props - Day group, review store, and whether merge can start.
 * @returns Raycast `List` of per-camera plan rows.
 */
export function MergePlanDay({ dayGroup, review, canMerge }: MergePlanDayProps) {
  const { overwriteKeys } = useMergeReviewSnapshot(review);
  const { pop } = useNavigation();

  return (
    <List
      navigationTitle={dayGroup.label}
      searchBarPlaceholder="Search cameras..."
      isShowingDetail={dayGroup.events.length > 0}
    >
      {dayGroup.events.map((event) => (
        <List.Section key={event.id} title={formatEventTimeLabel(event.folderName)}>
          {(event.readiness?.jobs ?? []).map((job) => {
            const key = getMergeOutputKey(event.eventDir, job.camera);
            const willOverwrite = overwriteKeys.has(key);
            const actionLabel = getJobActionLabel(job, willOverwrite);
            const isToggleable = job.isMergeable && job.hasExistingOutput;

            return (
              <List.Item
                key={key}
                title={getCameraDisplayName(job.camera)}
                subtitle={`${job.segmentCount} segment${job.segmentCount !== 1 ? "s" : ""}`}
                keywords={[job.outputFilename, job.camera, event.folderName]}
                icon={{
                  source: job.hasExistingOutput ? Icon.Document : Icon.Video,
                  tintColor: job.hasExistingOutput ? MODERN_COLORS.warning : MODERN_COLORS.primary,
                }}
                accessories={[
                  {
                    icon: isToggleable
                      ? willOverwrite
                        ? { source: Icon.ArrowCounterClockwise, tintColor: MODERN_COLORS.warning }
                        : { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }
                      : { source: Icon.Play, tintColor: MODERN_COLORS.primary },
                    tooltip: actionLabel,
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`### ${formatEventTitle(event.folderName)}\n\n**Camera:** ${getCameraDisplayName(job.camera)}\n\n**Segments:** ${job.segmentCount}\n\n**Output:** \`${job.outputFilename}\`\n\n**Action:** ${actionLabel}`}
                  />
                }
                actions={
                  <ActionPanel>
                    {isToggleable ? (
                      <Action
                        title={willOverwrite ? "Skip Existing Output" : "Overwrite Existing Output"}
                        icon={willOverwrite ? Icon.CheckCircle : Icon.ArrowCounterClockwise}
                        onAction={() => {
                          review.toggleOverwrite(event.eventDir, job.camera);
                          void showCameraOverwriteFeedback(event, job.camera, overwriteKeys);
                        }}
                      />
                    ) : null}
                    {buildGlobalMergeReviewActions(review, canMerge, pop)}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
