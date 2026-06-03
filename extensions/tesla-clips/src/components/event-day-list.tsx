/**
 * Lists all recordings for a single calendar day.
 *
 * @module components/event-day-list
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { formatEventTimeLabel, type EventDayGroup } from "../lib/event-day-groups";
import { formatEventClipCount, formatEventSearchKeywords } from "../lib/format-event";
import { getStatusAppearance } from "../lib/status-config";
import { buildEventDetailMarkdown } from "../lib/thumbnail";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { EventDetailMetadata } from "./event-detail";
import { SharedActionsSection } from "./shared-actions";

/** Props for {@link EventDayList}. */
type EventDayListProps = {
  readonly dayGroup: EventDayGroup;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
};

function EventDayItem({
  event,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: {
  readonly event: TeslaEvent;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
}) {
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
      title={formatEventTimeLabel(event.folderName)}
      subtitle={formatEventClipCount(event.totalSegments)}
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

/**
 * Renders timed recording rows for one {@link EventDayGroup}.
 *
 * @param props - Day group, merge state, and action callbacks.
 * @returns Raycast `List` for a single day's events.
 */
export function EventDayList({
  dayGroup,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: EventDayListProps) {
  return (
    <List
      navigationTitle={dayGroup.label}
      searchBarPlaceholder="Search recordings..."
      isShowingDetail={dayGroup.events.length > 0}
    >
      <List.Section>
        {dayGroup.events.map((event) => (
          <EventDayItem
            key={event.id}
            event={event}
            eventStatuses={eventStatuses}
            mergingEventId={mergingEventId}
            onMergeEvent={onMergeEvent}
            onMergeAll={onMergeAll}
            onRefresh={onRefresh}
            mergeOptions={mergeOptions}
            {...(onSelectFolders ? { onSelectFolders } : {})}
          />
        ))}
      </List.Section>
    </List>
  );
}
