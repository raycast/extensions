/**
 * Flat, month-grouped list of all Tesla recordings with merge actions.
 *
 * @module components/event-all-events-list
 */

import { formatEventTitle } from "../lib/format-event";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { EventListItem } from "./event-list-item";
import { MonthGroupedClipsList } from "./month-grouped-clips-list";

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
  return (
    <MonthGroupedClipsList
      navigationTitle="All Events"
      searchBarPlaceholder="Search events..."
      events={events}
      renderEventRow={(event) => (
        <EventListItem
          key={event.id}
          event={event}
          title={formatEventTitle(event.folderName)}
          eventStatuses={eventStatuses}
          mergingEventId={mergingEventId}
          onMergeEvent={onMergeEvent}
          onMergeAll={onMergeAll}
          onRefresh={onRefresh}
          mergeOptions={mergeOptions}
          {...(onSelectFolders ? { onSelectFolders } : {})}
        />
      )}
    />
  );
}
