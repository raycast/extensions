/**
 * Flat merge-review list of all events grouped by month.
 *
 * @module components/merge-section-all-clips-list
 */

import { formatEventTitle } from "../lib/format-event";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { MergeEventListItem } from "./merge-event-list-item";
import { MonthGroupedClipsList } from "./month-grouped-clips-list";

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
  return (
    <MonthGroupedClipsList
      navigationTitle={`All Clips (${review.events.length})`}
      events={review.events}
      renderEventRow={(event) => (
        <MergeEventListItem
          key={event.id}
          event={event}
          title={formatEventTitle(event.folderName)}
          ffmpegPath={ffmpegPath}
          review={review}
          canMerge={canMerge}
        />
      )}
    />
  );
}
