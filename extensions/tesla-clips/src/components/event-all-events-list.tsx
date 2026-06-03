/**
 * Flat, month-grouped list of all Tesla recordings with merge actions.
 *
 * @module components/event-all-events-list
 */

import { useMemo } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { formatMonthGroupSubtitle, groupDayGroupsByMonth, groupEventsByDay } from "../lib/event-day-groups";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { formatEventSearchKeywords, formatEventTitle } from "../lib/format-event";
import { getStatusAppearance } from "../lib/status-config";
import { buildEventDetailMarkdown } from "../lib/thumbnail";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { EventDetailMetadata } from "./event-detail";
import { SharedActionsSection } from "./shared-actions";

/** Props for {@link EventAllEventsList}. */
type EventAllEventsListProps = {
  readonly events: readonly TeslaEvent[];
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
};

function EventRecordingItem({
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
      title={formatEventTitle(event.folderName)}
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
 * Renders every event in a searchable list sorted by month and day.
 *
 * @param props - Events, merge status map, and shared list callbacks.
 * @returns Raycast `List` of recording rows with detail panes.
 */
export function EventAllEventsList({
  events,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: EventAllEventsListProps) {
  const monthGroups = useMemo(() => groupDayGroupsByMonth(groupEventsByDay(events)), [events]);

  return (
    <List navigationTitle="All Events" searchBarPlaceholder="Search events..." isShowingDetail={events.length > 0}>
      {monthGroups.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.flatMap((day) =>
            day.events.map((event) => (
              <EventRecordingItem
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
            )),
          )}
        </List.Section>
      ))}
    </List>
  );
}
