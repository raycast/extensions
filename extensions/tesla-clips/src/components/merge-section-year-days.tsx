/**
 * Merge category view: days within a year before opening per-day event lists.
 *
 * @module components/merge-section-year-days
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import type { ReactElement } from "react";
import { MODERN_COLORS } from "../constants";
import {
  formatDayGroupDetailMarkdown,
  formatDayGroupShortLabel,
  formatDayGroupSubtitle,
  formatMonthGroupSubtitle,
  type EventDayGroup,
  type EventYearGroup,
} from "../lib/event-day-groups";
import type { MergeEventCategory } from "../lib/merge-categories";
import { getEventsForCategory } from "../lib/merge-categories";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import type { TeslaEvent } from "../types";
import { MergeSectionDayView } from "./merge-section-day-view";
import { buildCategoryBulkActions, getDaySectionAccessory } from "./merge-section-shared";

/** Props for {@link MergeSectionYearDays}. */
type MergeSectionYearDaysProps = {
  readonly category: MergeEventCategory;
  readonly yearGroup: EventYearGroup;
  readonly review: MergeReviewStore;
  readonly pushScreen: (component: ReactElement) => void;
};

function MergeSectionYearDayRow({
  category,
  dayGroup,
  review,
  categoryEvents,
  pushScreen,
}: {
  readonly category: MergeEventCategory;
  readonly dayGroup: EventDayGroup;
  readonly review: MergeReviewStore;
  readonly categoryEvents: readonly TeslaEvent[];
  readonly pushScreen: (component: ReactElement) => void;
}) {
  const { pop } = useNavigation();
  const dayTitle = formatDayGroupShortLabel(dayGroup.dayKey);
  const accessory = getDaySectionAccessory(category, dayGroup);

  return (
    <List.Item
      title={dayTitle}
      subtitle={formatDayGroupSubtitle(dayGroup)}
      keywords={[dayGroup.dayKey, dayGroup.label, dayTitle]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={[{ icon: accessory.icon, tooltip: accessory.tooltip }]}
      detail={<List.Item.Detail markdown={formatDayGroupDetailMarkdown(dayGroup)} />}
      actions={
        <ActionPanel>
          <Action
            title={`View ${dayGroup.label}`}
            icon={Icon.ArrowRight}
            onAction={() => pushScreen(<MergeSectionDayView category={category} dayGroup={dayGroup} review={review} />)}
          />
          {buildCategoryBulkActions(category, categoryEvents, review)}
          <Action title="Start Merge" icon={Icon.Play} onAction={review.confirmMerge} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders day rows for one year inside a merge category.
 *
 * @param props - Category, year group, review store, and nested navigation.
 * @returns Raycast `List` of days with links to {@link MergeSectionDayView}.
 */
export function MergeSectionYearDays({ category, yearGroup, review, pushScreen }: MergeSectionYearDaysProps) {
  const categoryEvents = getEventsForCategory(review.categories, category);

  return (
    <List
      navigationTitle={yearGroup.label}
      searchBarPlaceholder="Search days..."
      isShowingDetail={yearGroup.events.length > 0}
    >
      {yearGroup.months.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.map((dayGroup) => (
            <MergeSectionYearDayRow
              key={dayGroup.dayKey}
              category={category}
              dayGroup={dayGroup}
              review={review}
              categoryEvents={categoryEvents}
              pushScreen={pushScreen}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
