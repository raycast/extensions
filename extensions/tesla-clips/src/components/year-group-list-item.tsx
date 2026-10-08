/**
 * Shared year-row rendering for merge/cleanup overview and category drill-down screens.
 *
 * @module components/year-group-list-item
 */

import type { ReactElement } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { formatYearGroupDetailMarkdown, formatYearGroupSubtitle, type EventYearGroup } from "../lib/event-day-groups";

/** Props for {@link YearGroupListItem}. */
type YearGroupListItemProps = {
  readonly yearGroup: EventYearGroup;
  readonly selectionAccessory?: { icon: { source: Icon; tintColor: string }; tooltip: string };
  readonly onView: () => void;
  readonly footerActions: ReactElement | readonly ReactElement[];
};

/**
 * Renders one year row: label, day-count subtitle, detail markdown, and a "View" action
 * followed by screen-specific footer actions.
 *
 * Shared by {@link MergeOverview}, {@link MergeSectionView}, and {@link CleanupOverview}.
 *
 * @param props - Year group, optional selection accessory, view handler, and footer actions.
 * @returns Raycast `List.Item` for a year drill-down row.
 */
export function YearGroupListItem({ yearGroup, selectionAccessory, onView, footerActions }: YearGroupListItemProps) {
  return (
    <List.Item
      title={yearGroup.label}
      subtitle={formatYearGroupSubtitle(yearGroup)}
      keywords={[yearGroup.yearKey, yearGroup.label]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={[
        ...(selectionAccessory ? [selectionAccessory] : []),
        { icon: Icon.ChevronRight, tooltip: "View days grouped by month" },
      ]}
      detail={<List.Item.Detail markdown={formatYearGroupDetailMarkdown(yearGroup)} />}
      actions={
        <ActionPanel>
          <Action title={`View ${yearGroup.label}`} icon={Icon.ArrowRight} onAction={onView} />
          {footerActions}
        </ActionPanel>
      }
    />
  );
}
