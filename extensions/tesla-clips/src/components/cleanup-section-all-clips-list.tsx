/**
 * Flat cleanup-review list of all events grouped by month.
 *
 * @module components/cleanup-section-all-clips-list
 */

import { useMemo } from "react";
import { List } from "@raycast/api";
import { formatMonthGroupSubtitle, groupDayGroupsByMonth, groupEventsByDay } from "../lib/event-day-groups";
import { formatEventTitle } from "../lib/format-event";
import type { CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { useCleanupReviewSnapshot } from "../hooks/use-cleanup-review-state";
import { CleanupEventListItem } from "./cleanup-event-list-item";

/** Props for {@link CleanupSectionAllClipsList}. */
type CleanupSectionAllClipsListProps = {
  readonly review: CleanupReviewStore;
  readonly ffmpegPath: string;
  readonly onStartCleanup: () => void;
};

/**
 * Renders all cleanup targets via {@link CleanupEventListItem} in month/day sections.
 *
 * @param props - Review store, ffmpeg path, and start-removal callback.
 * @returns Raycast `List` for browsing all clips in cleanup review.
 */
export function CleanupSectionAllClipsList({ review, ffmpegPath, onStartCleanup }: CleanupSectionAllClipsListProps) {
  const { selectedCount } = useCleanupReviewSnapshot(review);
  const monthGroups = useMemo(() => groupDayGroupsByMonth(groupEventsByDay(review.events)), [review.events]);

  return (
    <List
      navigationTitle={`All Clips (${selectedCount}/${review.events.length})`}
      searchBarPlaceholder="Search clips..."
      isShowingDetail={review.events.length > 0}
    >
      {monthGroups.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.flatMap((day) =>
            day.events.map((event) => (
              <CleanupEventListItem
                key={event.id}
                event={event}
                title={formatEventTitle(event.folderName)}
                ffmpegPath={ffmpegPath}
                review={review}
                onStartCleanup={onStartCleanup}
              />
            )),
          )}
        </List.Section>
      ))}
    </List>
  );
}
