/**
 * Per-category merge review drill-down by year.
 *
 * @module components/merge-section-view
 */

import { useEffect, useMemo, type ReactElement } from "react";
import { ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { groupEventsByYear } from "../lib/event-day-groups";
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
import { buildCategoryReviewFooterActions } from "./merge-section-shared";
import { YearGroupListItem } from "./year-group-list-item";

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
          actions={<ActionPanel>{buildCategoryReviewFooterActions(category, events, review, pop)}</ActionPanel>}
        />
      </List.Section>

      <List.Section title={title} subtitle={`${yearGroups.length} year${yearGroups.length !== 1 ? "s" : ""}`}>
        {yearGroups.map((yearGroup) => (
          <YearGroupListItem
            key={yearGroup.yearKey}
            yearGroup={yearGroup}
            onView={() =>
              pushScreen(
                <MergeSectionYearDays
                  category={category}
                  yearGroup={yearGroup}
                  review={review}
                  pushScreen={pushScreen}
                />,
              )
            }
            footerActions={buildCategoryReviewFooterActions(category, events, review, pop)}
          />
        ))}
      </List.Section>
    </List>
  );
}
