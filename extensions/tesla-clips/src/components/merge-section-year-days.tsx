/**
 * Merge category view: days within a year before opening per-day event lists.
 *
 * @module components/merge-section-year-days
 */

import { Action, Icon, useNavigation } from "@raycast/api";
import type { ReactElement } from "react";
import type { EventYearGroup } from "../lib/event-day-groups";
import type { MergeEventCategory } from "../lib/merge-categories";
import { getEventsForCategory } from "../lib/merge-categories";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { DayGroupListItem, MonthGroupedDayList } from "./day-group-list-item";
import { MergeSectionDayView } from "./merge-section-day-view";
import { buildCategoryReviewFooterActions, getDaySectionAccessory } from "./merge-section-shared";

/** Props for {@link MergeSectionYearDays}. */
type MergeSectionYearDaysProps = {
  readonly category: MergeEventCategory;
  readonly yearGroup: EventYearGroup;
  readonly review: MergeReviewStore;
  readonly pushScreen: (component: ReactElement) => void;
};

/**
 * Renders day rows for one year inside a merge category.
 *
 * @param props - Category, year group, review store, and nested navigation.
 * @returns Raycast `List` of days with links to {@link MergeSectionDayView}.
 */
export function MergeSectionYearDays({ category, yearGroup, review, pushScreen }: MergeSectionYearDaysProps) {
  const { pop } = useNavigation();
  const categoryEvents = getEventsForCategory(review.categories, category);

  return (
    <MonthGroupedDayList
      navigationTitle={yearGroup.label}
      yearGroup={yearGroup}
      renderDayRow={(dayGroup) => {
        const accessory = getDaySectionAccessory(category, dayGroup);
        return (
          <DayGroupListItem
            key={dayGroup.dayKey}
            dayGroup={dayGroup}
            accessories={[{ icon: accessory.icon, tooltip: accessory.tooltip }]}
            viewAction={
              <Action
                title={`View ${dayGroup.label}`}
                icon={Icon.ArrowRight}
                onAction={() =>
                  pushScreen(<MergeSectionDayView category={category} dayGroup={dayGroup} review={review} />)
                }
              />
            }
            footerActions={buildCategoryReviewFooterActions(category, categoryEvents, review, pop)}
          />
        );
      }}
    />
  );
}
