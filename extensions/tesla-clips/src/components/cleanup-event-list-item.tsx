/**
 * Single event row in cleanup review with include/exclude and removal actions.
 *
 * @module components/cleanup-event-list-item
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { useCleanupReviewSnapshot, type CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { formatEventSearchKeywords } from "../lib/format-event";
import type { TeslaEvent } from "../types";
import { EventDetailMetadata } from "./event-detail";
import {
  buildCleanupEventToggleAction,
  buildCleanupGlobalBulkActions,
  getCleanupSelectionAccessory,
} from "./cleanup-section-shared";
import { buildEventDetailMarkdown } from "../lib/thumbnail";

/** Props for {@link CleanupEventListItem}. */
type CleanupEventListItemProps = {
  readonly event: TeslaEvent;
  readonly title: string;
  readonly ffmpegPath: string;
  readonly review: CleanupReviewStore;
  readonly onStartCleanup: () => void;
};

/**
 * Renders one cleanup target with selection state, thumbnail detail, and removal actions.
 *
 * @param props - Event, title, ffmpeg path, review store, and start-removal handler.
 * @returns Raycast `List.Item` for cleanup review browsing.
 */
export function CleanupEventListItem({ event, title, ffmpegPath, review, onStartCleanup }: CleanupEventListItemProps) {
  const { pop } = useNavigation();
  const { selectedEventIds } = useCleanupReviewSnapshot(review);
  const isSelected = selectedEventIds.has(event.id);
  const status = getEventDisplayStatus(event, new Map(), undefined);
  const listIcon = getEventListIcon(status);
  const thumbnailPath = useEventThumbnail(event, ffmpegPath);
  const selectionAccessory = getCleanupSelectionAccessory(isSelected);
  const detailMarkdown = isSelected
    ? buildEventDetailMarkdown(thumbnailPath)
    : `${buildEventDetailMarkdown(thumbnailPath)}\n\n---\n\n**Excluded from removal.** Use *Include in Removal* to add this clip back.`;

  return (
    <List.Item
      icon={listIcon}
      title={title}
      keywords={formatEventSearchKeywords(event)}
      accessories={[selectionAccessory]}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
          metadata={<EventDetailMetadata event={event} result={undefined} status={status} />}
        />
      }
      actions={
        <ActionPanel>
          {buildCleanupEventToggleAction(event, review, isSelected)}
          {buildCleanupGlobalBulkActions(review)}
          <Action title="Start Removal" icon={Icon.Trash} onAction={onStartCleanup} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelCleanup} />
        </ActionPanel>
      }
    />
  );
}
