/**
 * Year drill-down: months and days before opening {@link EventDayList}.
 *
 * @module components/event-year-days-list
 */

import { Action, Icon } from "@raycast/api";
import type { EventYearGroup } from "../lib/event-day-groups";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { DayGroupListItem, MonthGroupedDayList } from "./day-group-list-item";
import { EventDayList } from "./event-day-list";
import { SharedActionsSection } from "./shared-actions";

/** Props for {@link EventYearDaysList}. */
type EventYearDaysListProps = {
  readonly yearGroup: EventYearGroup;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
};

/**
 * Renders day rows grouped by month for a selected year.
 *
 * @param props - Year group and shared event list handlers.
 * @returns Raycast `List` navigating into per-day recording lists.
 */
export function EventYearDaysList({
  yearGroup,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: EventYearDaysListProps) {
  return (
    <MonthGroupedDayList
      navigationTitle={yearGroup.label}
      yearGroup={yearGroup}
      renderDayRow={(dayGroup) => (
        <DayGroupListItem
          key={dayGroup.dayKey}
          dayGroup={dayGroup}
          accessories={[{ icon: Icon.ChevronRight, tooltip: `${dayGroup.eventCount} recordings` }]}
          viewAction={
            <Action.Push
              title={`View ${dayGroup.label}`}
              icon={Icon.ArrowRight}
              target={
                <EventDayList
                  dayGroup={dayGroup}
                  eventStatuses={eventStatuses}
                  mergingEventId={mergingEventId}
                  onMergeEvent={onMergeEvent}
                  onMergeAll={onMergeAll}
                  onRefresh={onRefresh}
                  mergeOptions={mergeOptions}
                  {...(onSelectFolders ? { onSelectFolders } : {})}
                />
              }
            />
          }
          footerActions={
            <>
              <Action title="Merge All Events" icon={Icon.BulletPoints} onAction={onMergeAll} />
              <SharedActionsSection onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
            </>
          }
        />
      )}
    />
  );
}
