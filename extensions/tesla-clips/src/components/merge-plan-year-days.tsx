/**
 * Merge plan navigation by year and day (camera-level plan on each day).
 *
 * @module components/merge-plan-year-days
 */

import { Action, Icon, useNavigation } from "@raycast/api";
import type { ReactElement } from "react";
import type { EventYearGroup } from "../lib/event-day-groups";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { DayGroupListItem, MonthGroupedDayList } from "./day-group-list-item";
import { MergePlanDay } from "./merge-plan-day";

/** Props for {@link MergePlanYearDays}. */
type MergePlanYearDaysProps = {
  readonly yearGroup: EventYearGroup;
  readonly review: MergeReviewStore;
  readonly canMerge: boolean;
  readonly pushScreen: (component: ReactElement) => void;
};

/**
 * Renders days in a year for per-camera merge planning ({@link MergePlanDay}).
 *
 * @param props - Year group, review store, merge availability, and nested navigation.
 * @returns Raycast `List` of days in the merge plan flow.
 */
export function MergePlanYearDays({ yearGroup, review, canMerge, pushScreen }: MergePlanYearDaysProps) {
  const { pop } = useNavigation();

  return (
    <MonthGroupedDayList
      navigationTitle={yearGroup.label}
      yearGroup={yearGroup}
      renderDayRow={(dayGroup) => (
        <DayGroupListItem
          key={dayGroup.dayKey}
          dayGroup={dayGroup}
          accessories={[{ icon: Icon.ChevronRight, tooltip: "View cameras for this day" }]}
          viewAction={
            <Action
              title={`View ${dayGroup.label}`}
              icon={Icon.ArrowRight}
              onAction={() => pushScreen(<MergePlanDay dayGroup={dayGroup} review={review} canMerge={canMerge} />)}
            />
          }
          footerActions={
            <>
              <Action
                title={canMerge ? "Start Merge" : "Nothing to Merge"}
                icon={Icon.Play}
                onAction={review.confirmMerge}
              />
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
              <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
            </>
          }
        />
      )}
    />
  );
}
