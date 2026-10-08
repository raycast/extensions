/**
 * Single event row inside merge review clip lists.
 *
 * @module components/merge-event-list-item
 */

import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { useMergeReviewSnapshot, type MergeReviewStore } from "../hooks/use-merge-review-state";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { formatEventSearchKeywords } from "../lib/format-event";
import { buildEventDetailMarkdown } from "../lib/thumbnail";
import type { TeslaEvent } from "../types";
import { EventDetailMetadata } from "./event-detail";
import { buildGlobalMergeReviewActions } from "./merge-section-shared";

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
      actions={<ActionPanel>{buildGlobalMergeReviewActions(review, canMerge, pop)}</ActionPanel>}
    />
  );
}
