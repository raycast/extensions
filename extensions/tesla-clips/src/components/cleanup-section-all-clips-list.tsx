/**
 * Flat cleanup-review list of all events grouped by month.
 *
 * @module components/cleanup-section-all-clips-list
 */

import { formatEventTitle } from "../lib/format-event";
import type { CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { useCleanupReviewSnapshot } from "../hooks/use-cleanup-review-state";
import { CleanupEventListItem } from "./cleanup-event-list-item";
import { MonthGroupedClipsList } from "./month-grouped-clips-list";

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

  return (
    <MonthGroupedClipsList
      navigationTitle={`All Clips (${selectedCount}/${review.events.length})`}
      events={review.events}
      renderEventRow={(event) => (
        <CleanupEventListItem
          key={event.id}
          event={event}
          title={formatEventTitle(event.folderName)}
          ffmpegPath={ffmpegPath}
          review={review}
          onStartCleanup={onStartCleanup}
        />
      )}
    />
  );
}
