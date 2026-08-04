/**
 * Shared day-row and month-grouped list scaffolding for year drill-down screens.
 *
 * @module components/day-group-list-item
 */

import type { ReactElement, ReactNode } from "react";
import { ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import {
  formatDayGroupDetailMarkdown,
  formatDayGroupShortLabel,
  formatDayGroupSubtitle,
  formatMonthGroupSubtitle,
  type EventDayGroup,
  type EventYearGroup,
} from "../lib/event-day-groups";

/** Props for {@link DayGroupListItem}. */
type DayGroupListItemProps = {
  readonly dayGroup: EventDayGroup;
  readonly accessories: List.Item.Accessory[];
  readonly viewAction: ReactElement;
  readonly footerActions?: ReactNode;
};

/**
 * Renders one day row: short date title, event-count subtitle, detail markdown, and a
 * "View" action followed by screen-specific footer actions.
 *
 * Shared by {@link EventYearDaysList}, {@link MergePlanYearDays}, {@link MergeSectionYearDays},
 * and {@link CleanupSectionYearDays}.
 *
 * @param props - Day group, row accessories, view action, and footer actions.
 * @returns Raycast `List.Item` for a day drill-down row.
 */
export function DayGroupListItem({ dayGroup, accessories, viewAction, footerActions }: DayGroupListItemProps) {
  const dayTitle = formatDayGroupShortLabel(dayGroup.dayKey);

  return (
    <List.Item
      title={dayTitle}
      subtitle={formatDayGroupSubtitle(dayGroup)}
      keywords={[dayGroup.dayKey, dayGroup.label, dayTitle]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={accessories}
      detail={<List.Item.Detail markdown={formatDayGroupDetailMarkdown(dayGroup)} />}
      actions={
        <ActionPanel>
          {viewAction}
          {footerActions}
        </ActionPanel>
      }
    />
  );
}

/** Props for {@link MonthGroupedDayList}. */
type MonthGroupedDayListProps = {
  readonly navigationTitle: string;
  readonly yearGroup: EventYearGroup;
  readonly renderDayRow: (dayGroup: EventDayGroup) => ReactElement;
};

/**
 * Renders a year's days grouped by month, delegating each row to `renderDayRow`.
 *
 * Shared list scaffold for the same four year drill-down screens as {@link DayGroupListItem}.
 *
 * @param props - Navigation title, year group, and a per-day row renderer.
 * @returns Raycast `List` of month sections containing day rows.
 */
export function MonthGroupedDayList({ navigationTitle, yearGroup, renderDayRow }: MonthGroupedDayListProps) {
  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search days..."
      isShowingDetail={yearGroup.events.length > 0}
    >
      {yearGroup.months.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.map((dayGroup) => renderDayRow(dayGroup))}
        </List.Section>
      ))}
    </List>
  );
}
