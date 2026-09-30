/**
 * Shared month-grouped "all clips" list scaffold for review flows.
 *
 * @module components/month-grouped-clips-list
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import { List } from "@raycast/api";
import { formatMonthGroupSubtitle, groupDayGroupsByMonth, groupEventsByDay } from "../lib/event-day-groups";
import type { TeslaEvent } from "../types";

/** Props for {@link MonthGroupedClipsList}. */
type MonthGroupedClipsListProps = {
  readonly navigationTitle: string;
  readonly searchBarPlaceholder?: string;
  readonly events: readonly TeslaEvent[];
  readonly renderEventRow: (event: TeslaEvent) => ReactElement;
};

/**
 * Groups events by month/day and renders each event via `renderEventRow`.
 *
 * Shared by {@link CleanupSectionAllClipsList}, {@link MergeSectionAllClipsList}, and
 * {@link EventAllEventsList}.
 *
 * @param props - Navigation title, flat event list, and a per-event row renderer.
 * @returns Raycast `List` of month sections containing event rows.
 */
export function MonthGroupedClipsList({
  navigationTitle,
  searchBarPlaceholder = "Search clips...",
  events,
  renderEventRow,
}: MonthGroupedClipsListProps) {
  const monthGroups = useMemo(() => groupDayGroupsByMonth(groupEventsByDay(events)), [events]);

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      isShowingDetail={events.length > 0}
    >
      {monthGroups.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.flatMap((day) => day.events.map((event) => renderEventRow(event)))}
        </List.Section>
      ))}
    </List>
  );
}
