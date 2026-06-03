/**
 * Per-category merge review drill-down by year.
 *
 * @module components/merge-section-view
 */

import { useEffect, useMemo, type ReactElement } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { formatYearGroupDetailMarkdown, formatYearGroupSubtitle, groupEventsByYear } from "../lib/event-day-groups";
import { formatEventClipCount } from "../lib/format-event";
import {
  getCategoryReviewStatus,
  getCategoryStatusIntroMarkdown,
  getEventsForCategory,
  getMergeCategoryLabel,
  type MergeEventCategory,
} from "../lib/merge-categories";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { useMergeReviewSnapshot } from "../hooks/use-merge-review-state";
import { CategoryStatusMetadata } from "./event-detail";
import { MergeSectionYearDays } from "./merge-section-year-days";
import { buildCategoryBulkActions } from "./merge-section-shared";

/** Props for {@link MergeSectionView}. */
type MergeSectionViewProps = {
  readonly category: MergeEventCategory;
  readonly review: MergeReviewStore;
  readonly pushScreen: (component: ReactElement) => void;
};

/**
 * Renders category intro metadata and year-grouped navigation into day/event lists.
 *
 * @param props - Merge category, review store, and nested screen pusher.
 * @returns Raycast `List` for one merge review category.
 */
export function MergeSectionView({ category, review, pushScreen }: MergeSectionViewProps) {
  const { pop } = useNavigation();
  const { overwriteKeys, reviewedCategories } = useMergeReviewSnapshot(review);
  const events = getEventsForCategory(review.categories, category);
  const yearGroups = useMemo(() => groupEventsByYear(events), [events]);
  const title = getMergeCategoryLabel(category);
  const reviewStatus = getCategoryReviewStatus(category, reviewedCategories);

  useEffect(() => {
    review.markCategoryReviewed(category);
  }, [category, review]);

  return (
    <List navigationTitle={title} searchBarPlaceholder="Search years..." isShowingDetail>
      <List.Section>
        <List.Item
          title="About This Category"
          subtitle={formatEventClipCount(events.reduce((sum, event) => sum + event.totalSegments, 0))}
          icon={{ source: Icon.Info, tintColor: MODERN_COLORS.neutral }}
          detail={
            <List.Item.Detail
              markdown={getCategoryStatusIntroMarkdown(category, reviewStatus)}
              metadata={
                <CategoryStatusMetadata
                  category={category}
                  events={events}
                  overwriteKeys={overwriteKeys}
                  reviewStatus={reviewStatus}
                />
              }
            />
          }
          actions={
            <ActionPanel>
              {buildCategoryBulkActions(category, events, review)}
              <Action title="Start Merge" icon={Icon.Play} onAction={review.confirmMerge} />
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
              <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={title} subtitle={`${yearGroups.length} year${yearGroups.length !== 1 ? "s" : ""}`}>
        {yearGroups.map((yearGroup) => (
          <List.Item
            key={yearGroup.yearKey}
            title={yearGroup.label}
            subtitle={formatYearGroupSubtitle(yearGroup)}
            keywords={[yearGroup.yearKey, yearGroup.label]}
            icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
            accessories={[{ icon: Icon.ChevronRight, tooltip: "View days grouped by month" }]}
            detail={<List.Item.Detail markdown={formatYearGroupDetailMarkdown(yearGroup)} />}
            actions={
              <ActionPanel>
                <Action
                  title={`View ${yearGroup.label}`}
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    pushScreen(
                      <MergeSectionYearDays
                        category={category}
                        yearGroup={yearGroup}
                        review={review}
                        pushScreen={pushScreen}
                      />,
                    )
                  }
                />
                {buildCategoryBulkActions(category, events, review)}
                <Action title="Start Merge" icon={Icon.Play} onAction={review.confirmMerge} />
                <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
                <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
