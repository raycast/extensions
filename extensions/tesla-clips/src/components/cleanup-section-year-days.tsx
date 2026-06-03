/**
 * Cleanup review: days within a year before per-day event selection.
 *
 * @module components/cleanup-section-year-days
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import type { ReactElement } from "react";
import { MODERN_COLORS } from "../constants";
import {
  formatDayGroupDetailMarkdown,
  formatDayGroupShortLabel,
  formatDayGroupSubtitle,
  formatMonthGroupSubtitle,
  type EventDayGroup,
  type EventYearGroup,
} from "../lib/event-day-groups";
import type { CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { useCleanupReviewSnapshot } from "../hooks/use-cleanup-review-state";
import { buildCleanupBulkActions, getCleanupGroupSelectionAccessory } from "./cleanup-section-shared";
import { CleanupSectionDayView } from "./cleanup-section-day-view";

/** Props for {@link CleanupSectionYearDays}. */
type CleanupSectionYearDaysProps = {
  readonly yearGroup: EventYearGroup;
  readonly review: CleanupReviewStore;
  readonly ffmpegPath: string;
  readonly onStartCleanup: () => void;
  readonly pushScreen: (component: ReactElement) => void;
};

function CleanupSectionYearDayRow({
  dayGroup,
  review,
  ffmpegPath,
  onStartCleanup,
  pushScreen,
}: {
  readonly dayGroup: EventDayGroup;
  readonly review: CleanupReviewStore;
  readonly ffmpegPath: string;
  readonly onStartCleanup: () => void;
  readonly pushScreen: (component: ReactElement) => void;
}) {
  const { pop } = useNavigation();
  const { selectedEventIds, selectedCount } = useCleanupReviewSnapshot(review);
  const dayTitle = formatDayGroupShortLabel(dayGroup.dayKey);
  const startRemovalTitle = selectedCount > 0 ? `Start Removal (${selectedCount})` : "Nothing Selected";

  return (
    <List.Item
      title={dayTitle}
      subtitle={formatDayGroupSubtitle(dayGroup)}
      keywords={[dayGroup.dayKey, dayGroup.label, dayTitle]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={[
        getCleanupGroupSelectionAccessory(dayGroup.events, selectedEventIds),
        { icon: Icon.ChevronRight, tooltip: "View events" },
      ]}
      detail={<List.Item.Detail markdown={formatDayGroupDetailMarkdown(dayGroup)} />}
      actions={
        <ActionPanel>
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
          {buildCleanupBulkActions(dayGroup.events, review, dayTitle)}
          <Action title={startRemovalTitle} icon={Icon.Trash} onAction={onStartCleanup} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelCleanup} />
        </ActionPanel>
      }
    />
  );
}

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
  const { selectedEventIds } = useCleanupReviewSnapshot(review);
  const yearSelectedCount = yearGroup.events.filter((event) => selectedEventIds.has(event.id)).length;

  return (
    <List
      navigationTitle={`${yearGroup.label} (${yearSelectedCount}/${yearGroup.events.length})`}
      searchBarPlaceholder="Search days..."
      isShowingDetail={yearGroup.events.length > 0}
    >
      {yearGroup.months.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.map((dayGroup) => (
            <CleanupSectionYearDayRow
              key={dayGroup.dayKey}
              dayGroup={dayGroup}
              review={review}
              ffmpegPath={ffmpegPath}
              onStartCleanup={onStartCleanup}
              pushScreen={pushScreen}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
