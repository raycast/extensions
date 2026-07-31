/**
 * Shared recording row for merge-oriented event lists (all-events and single-day views).
 *
 * @module components/event-list-item
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { formatEventSearchKeywords } from "../lib/format-event";
import { getStatusAppearance } from "../lib/status-config";
import { buildEventDetailMarkdown } from "../lib/thumbnail";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { EventDetailMetadata } from "./event-detail";
import { SharedActionsSection } from "./shared-actions";

/** Props for {@link EventListItem}. */
export type EventListItemProps = {
  readonly event: TeslaEvent;
  readonly title: string;
  readonly subtitle?: string;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
};

/**
 * Renders one recording row with thumbnail detail and merge actions.
 *
 * Shared by {@link EventAllEventsList} (title only) and {@link EventDayList} (title + subtitle).
 *
 * @param props - Event, display title/subtitle, merge status map, and shared list callbacks.
 * @returns Raycast `List.Item` with detail pane and merge actions.
 */
export function EventListItem({
  event,
  title,
  subtitle,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: EventListItemProps) {
  const { pop } = useNavigation();
  const status = getEventDisplayStatus(event, eventStatuses, mergingEventId);
  const { icon: statusIcon, label: statusLabel } = getStatusAppearance(status);
  const listIcon = getEventListIcon(status);
  const result = eventStatuses.get(event.id);
  const thumbnailPath = useEventThumbnail(event, mergeOptions.ffmpegPath);

  const gapNote = event.totalGaps > 0 ? ` · ${event.totalGaps} gap${event.totalGaps !== 1 ? "s" : ""}` : "";
  const existingNote =
    event.readiness && event.readiness.existingOutputCount > 0
      ? ` · ${event.readiness.existingOutputCount} existing`
      : "";
  const showGapWarning = event.totalGaps > 0 && (status === "pending" || status === "existing-partial");
  const accessoryIcon = showGapWarning ? { source: Icon.Warning, tintColor: MODERN_COLORS.warning } : statusIcon;

  return (
    <List.Item
      icon={listIcon}
      title={title}
      {...(subtitle !== undefined ? { subtitle } : {})}
      keywords={formatEventSearchKeywords(event)}
      accessories={[
        {
          icon: accessoryIcon,
          tooltip: `${statusLabel}${existingNote}${gapNote}`,
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={buildEventDetailMarkdown(thumbnailPath)}
          metadata={<EventDetailMetadata event={event} result={result} status={status} />}
        />
      }
      actions={
        <ActionPanel>
          <Action title="Merge This Event" icon={Icon.Play} onAction={() => onMergeEvent(event)} />
          <Action
            title="Merge All Events"
            icon={Icon.BulletPoints}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onMergeAll}
          />
          <SharedActionsSection eventDir={event.eventDir} onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
