/**
 * Lists all recordings for a single calendar day.
 *
 * @module components/event-day-list
 */

import { List } from "@raycast/api";
import { formatEventTimeLabel, type EventDayGroup } from "../lib/event-day-groups";
import { formatEventClipCount } from "../lib/format-event";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { EventListItem } from "./event-list-item";

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
          <EventListItem
            key={event.id}
            event={event}
            title={formatEventTimeLabel(event.folderName)}
            subtitle={formatEventClipCount(event.totalSegments)}
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
