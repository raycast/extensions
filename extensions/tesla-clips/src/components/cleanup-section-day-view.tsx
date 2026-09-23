/**
 * Cleanup review: selectable events for one calendar day.
 *
 * @module components/cleanup-section-day-view
 */

import { List } from "@raycast/api";
import { formatEventTimeLabel, type EventDayGroup } from "../lib/event-day-groups";
import type { CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { useCleanupReviewSnapshot } from "../hooks/use-cleanup-review-state";
import { CleanupEventListItem } from "./cleanup-event-list-item";

/** Props for {@link CleanupSectionDayView}. */
type CleanupSectionDayViewProps = {
  readonly dayGroup: EventDayGroup;
  readonly review: CleanupReviewStore;
  readonly ffmpegPath: string;
  readonly onStartCleanup: () => void;
};

/**
 * Renders {@link CleanupEventListItem} rows for each event on the given day.
 *
 * @param props - Day group, review store, ffmpeg path, and start-removal handler.
 * @returns Raycast `List` for day-scoped cleanup selection.
 */
export function CleanupSectionDayView({ dayGroup, review, ffmpegPath, onStartCleanup }: CleanupSectionDayViewProps) {
  const { selectedEventIds } = useCleanupReviewSnapshot(review);
  const daySelectedCount = dayGroup.events.filter((event) => selectedEventIds.has(event.id)).length;

  return (
    <List
      navigationTitle={`${dayGroup.label} (${daySelectedCount}/${dayGroup.events.length})`}
      searchBarPlaceholder="Search events..."
      isShowingDetail
    >
      <List.Section>
        {dayGroup.events.map((event) => (
          <CleanupEventListItem
            key={event.id}
            event={event}
            title={formatEventTimeLabel(event.folderName)}
            ffmpegPath={ffmpegPath}
            review={review}
            onStartCleanup={onStartCleanup}
          />
        ))}
      </List.Section>
    </List>
  );
}
