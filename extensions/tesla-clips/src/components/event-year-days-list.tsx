/**
 * Year drill-down: months and days before opening {@link EventDayList}.
 *
 * @module components/event-year-days-list
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import {
  formatDayGroupDetailMarkdown,
  formatDayGroupShortLabel,
  formatDayGroupSubtitle,
  formatMonthGroupSubtitle,
  type EventDayGroup,
  type EventYearGroup,
} from "../lib/event-day-groups";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "../types";
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

function EventYearDayRow({
  dayGroup,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: {
  readonly dayGroup: EventDayGroup;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
}) {
  const dayTitle = formatDayGroupShortLabel(dayGroup.dayKey);

  return (
    <List.Item
      title={dayTitle}
      subtitle={formatDayGroupSubtitle(dayGroup)}
      keywords={[dayGroup.dayKey, dayGroup.label, dayTitle]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={[{ icon: Icon.ChevronRight, tooltip: `${dayGroup.eventCount} recordings` }]}
      detail={<List.Item.Detail markdown={formatDayGroupDetailMarkdown(dayGroup)} />}
      actions={
        <ActionPanel>
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
          <Action title="Merge All Events" icon={Icon.BulletPoints} onAction={onMergeAll} />
          <SharedActionsSection onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
        </ActionPanel>
      }
    />
  );
}

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
    <List
      navigationTitle={yearGroup.label}
      searchBarPlaceholder="Search days..."
      isShowingDetail={yearGroup.events.length > 0}
    >
      {yearGroup.months.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.map((dayGroup) => (
            <EventYearDayRow
              key={dayGroup.dayKey}
              dayGroup={dayGroup}
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
      ))}
    </List>
  );
}
