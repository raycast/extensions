/**
 * Flat merge-review list of all events grouped by month.
 *
 * @module components/merge-section-all-clips-list
 */

import { useMemo } from "react";
import { List } from "@raycast/api";
import { formatMonthGroupSubtitle, groupDayGroupsByMonth, groupEventsByDay } from "../lib/event-day-groups";
import { formatEventTitle } from "../lib/format-event";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { MergeEventListItem } from "./merge-event-list-item";

/** Props for {@link MergeSectionAllClipsList}. */
type MergeSectionAllClipsListProps = {
  readonly review: MergeReviewStore;
  readonly ffmpegPath: string;
  readonly canMerge: boolean;
};

/**
 * Renders all review events via {@link MergeEventListItem} in month/day sections.
 *
 * @param props - Review store, ffmpeg path, and whether merge can start.
 * @returns Raycast `List` of clips in the merge review flow.
 */
export function MergeSectionAllClipsList({ review, ffmpegPath, canMerge }: MergeSectionAllClipsListProps) {
  const monthGroups = useMemo(() => groupDayGroupsByMonth(groupEventsByDay(review.events)), [review.events]);

  return (
    <List
      navigationTitle={`All Clips (${review.events.length})`}
      searchBarPlaceholder="Search clips..."
      isShowingDetail={review.events.length > 0}
    >
      {monthGroups.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.flatMap((day) =>
            day.events.map((event) => (
              <MergeEventListItem
                key={event.id}
                event={event}
                title={formatEventTitle(event.folderName)}
                ffmpegPath={ffmpegPath}
                review={review}
                canMerge={canMerge}
              />
            )),
          )}
        </List.Section>
      ))}
    </List>
  );
}
