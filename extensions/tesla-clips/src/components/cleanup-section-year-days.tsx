/**
 * Cleanup review: days within a year before per-day event selection.
 *
 * @module components/cleanup-section-year-days
 */

import { Action, Icon, useNavigation } from "@raycast/api";
import type { ReactElement } from "react";
import { formatDayGroupShortLabel, type EventYearGroup } from "../lib/event-day-groups";
import type { CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { useCleanupReviewSnapshot } from "../hooks/use-cleanup-review-state";
import { buildCleanupBulkActions, getCleanupGroupSelectionAccessory } from "./cleanup-section-shared";
import { CleanupSectionDayView } from "./cleanup-section-day-view";
import { DayGroupListItem, MonthGroupedDayList } from "./day-group-list-item";

/** Props for {@link CleanupSectionYearDays}. */
type CleanupSectionYearDaysProps = {
  readonly yearGroup: EventYearGroup;
  readonly review: CleanupReviewStore;
  readonly ffmpegPath: string;
  readonly onStartCleanup: () => void;
  readonly pushScreen: (component: ReactElement) => void;
};

/**
 * Renders day rows for one year with selection accessories and links to {@link CleanupSectionDayView}.
 *
 * @param props - Year group, review store, ffmpeg path, cleanup starter, and nested navigation.
 * @returns Raycast `List` of days in the cleanup review flow.
 */
export function CleanupSectionYearDays({
  yearGroup,
  review,
  ffmpegPath,
  onStartCleanup,
  pushScreen,
}: CleanupSectionYearDaysProps) {
  const { pop } = useNavigation();
  const { selectedEventIds, selectedCount } = useCleanupReviewSnapshot(review);
  const yearSelectedCount = yearGroup.events.filter((event) => selectedEventIds.has(event.id)).length;

  return (
    <MonthGroupedDayList
      navigationTitle={`${yearGroup.label} (${yearSelectedCount}/${yearGroup.events.length})`}
      yearGroup={yearGroup}
      renderDayRow={(dayGroup) => {
        const dayTitle = formatDayGroupShortLabel(dayGroup.dayKey);
        const startRemovalTitle = selectedCount > 0 ? `Start Removal (${selectedCount})` : "Nothing Selected";

        return (
          <DayGroupListItem
            key={dayGroup.dayKey}
            dayGroup={dayGroup}
            accessories={[
              getCleanupGroupSelectionAccessory(dayGroup.events, selectedEventIds),
              { icon: Icon.ChevronRight, tooltip: "View events" },
            ]}
            viewAction={
              <Action
                title={`View ${dayGroup.label}`}
                icon={Icon.ArrowRight}
                onAction={() =>
                  pushScreen(
                    <CleanupSectionDayView
                      dayGroup={dayGroup}
                      review={review}
                      ffmpegPath={ffmpegPath}
                      onStartCleanup={onStartCleanup}
                    />,
                  )
                }
              />
            }
            footerActions={
              <>
                {buildCleanupBulkActions(dayGroup.events, review, dayTitle)}
                <Action title={startRemovalTitle} icon={Icon.Trash} onAction={onStartCleanup} />
                <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
                <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelCleanup} />
              </>
            }
          />
        );
      }}
    />
  );
}
