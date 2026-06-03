/**
 * Single event row inside merge review clip lists.
 *
 * @module components/merge-event-list-item
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { useMergeReviewSnapshot, type MergeReviewStore } from "../hooks/use-merge-review-state";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { formatEventSearchKeywords } from "../lib/format-event";
import { showGlobalOverwriteFeedback } from "../lib/merge-review-feedback";
import { buildEventDetailMarkdown } from "../lib/thumbnail";
import type { TeslaEvent } from "../types";
import { EventDetailMetadata } from "./event-detail";

/** Props for {@link MergeEventListItem}. */
type MergeEventListItemProps = {
  readonly event: TeslaEvent;
  readonly title: string;
  readonly ffmpegPath: string;
  readonly review: MergeReviewStore;
  readonly canMerge: boolean;
};

/**
 * Renders one event with thumbnail detail and global merge/overwrite actions.
 *
 * @param props - Event, display title, ffmpeg path, review store, and merge availability flag.
 * @returns Raycast `List.Item` for merge review browsing.
 */
export function MergeEventListItem({ event, title, ffmpegPath, review, canMerge }: MergeEventListItemProps) {
  const { pop } = useNavigation();
  useMergeReviewSnapshot(review);
  const status = getEventDisplayStatus(event, new Map(), undefined);
  const listIcon = getEventListIcon(status);
  const thumbnailPath = useEventThumbnail(event, ffmpegPath);
  const detailMarkdown = buildEventDetailMarkdown(thumbnailPath);

  return (
    <List.Item
      icon={listIcon}
      title={title}
      keywords={formatEventSearchKeywords(event)}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
          metadata={<EventDetailMetadata event={event} result={undefined} status={status} />}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={canMerge ? "Start Merge" : "Nothing to Merge"}
            icon={Icon.Play}
            onAction={review.confirmMerge}
          />
          <Action
            title="Skip All Existing"
            icon={Icon.CheckCircle}
            onAction={() => {
              review.skipAllExisting();
              void showGlobalOverwriteFeedback(false, review.events);
            }}
          />
          <Action
            title="Overwrite All Existing"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => {
              review.selectAllOverwrites();
              void showGlobalOverwriteFeedback(true, review.events);
            }}
          />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
        </ActionPanel>
      }
    />
  );
}
