/**
 * Merge plan navigation by year and day (camera-level plan on each day).
 *
 * @module components/merge-plan-year-days
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
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { MergePlanDay } from "./merge-plan-day";

/** Props for {@link MergePlanYearDays}. */
type MergePlanYearDaysProps = {
  readonly yearGroup: EventYearGroup;
  readonly review: MergeReviewStore;
  readonly canMerge: boolean;
  readonly pushScreen: (component: ReactElement) => void;
};

function MergePlanYearDayRow({
  dayGroup,
  review,
  canMerge,
  pushScreen,
}: {
  readonly dayGroup: EventDayGroup;
  readonly review: MergeReviewStore;
  readonly canMerge: boolean;
  readonly pushScreen: (component: ReactElement) => void;
}) {
  const { pop } = useNavigation();
  const dayTitle = formatDayGroupShortLabel(dayGroup.dayKey);

  return (
    <List.Item
      title={dayTitle}
      subtitle={formatDayGroupSubtitle(dayGroup)}
      keywords={[dayGroup.dayKey, dayGroup.label, dayTitle]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={[{ icon: Icon.ChevronRight, tooltip: "View cameras for this day" }]}
      detail={<List.Item.Detail markdown={formatDayGroupDetailMarkdown(dayGroup)} />}
      actions={
        <ActionPanel>
          <Action
            title={`View ${dayGroup.label}`}
            icon={Icon.ArrowRight}
            onAction={() => pushScreen(<MergePlanDay dayGroup={dayGroup} review={review} canMerge={canMerge} />)}
          />
          <Action
            title={canMerge ? "Start Merge" : "Nothing to Merge"}
            icon={Icon.Play}
            onAction={review.confirmMerge}
          />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders days in a year for per-camera merge planning ({@link MergePlanDay}).
 *
 * @param props - Year group, review store, merge availability, and nested navigation.
 * @returns Raycast `List` of days in the merge plan flow.
 */
export function MergePlanYearDays({ yearGroup, review, canMerge, pushScreen }: MergePlanYearDaysProps) {
  return (
    <List
      navigationTitle={yearGroup.label}
      searchBarPlaceholder="Search days..."
      isShowingDetail={yearGroup.events.length > 0}
    >
      {yearGroup.months.map((month) => (
        <List.Section key={month.monthKey} title={month.label} subtitle={formatMonthGroupSubtitle(month)}>
          {month.days.map((dayGroup) => (
            <MergePlanYearDayRow
              key={dayGroup.dayKey}
              dayGroup={dayGroup}
              review={review}
              canMerge={canMerge}
              pushScreen={pushScreen}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
