/**
 * Top-level merge review list: summary, categories, clips, and year navigation.
 *
 * @module components/merge-overview
 */

import { useMemo, type ReactElement } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { groupEventsByYear } from "../lib/event-day-groups";
import {
  getCategoryReviewStatus,
  getCategoryStatusIntroMarkdown,
  getEventsForCategory,
  getMergeCategoryLabel,
  summarizeMergeCategories,
  type MergeEventCategory,
} from "../lib/merge-categories";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { useMergeReviewSnapshot } from "../hooks/use-merge-review-state";
import { MergePlanYearDays } from "./merge-plan-year-days";
import { MergeSectionAllClipsList } from "./merge-section-all-clips-list";
import { MergeSectionView } from "./merge-section-view";
import { buildCategoryBulkActions, getCategoryReviewListAccessory } from "./merge-section-shared";
import { CategoryStatusMetadata } from "./event-detail";
import { YearGroupListItem } from "./year-group-list-item";

/** Props for {@link MergeOverview}. */
type MergeOverviewProps = {
  readonly review: MergeReviewStore;
  readonly ffmpegPath: string;
  readonly pushScreen: (component: ReactElement) => void;
};

function buildMergeSummaryMarkdown(plannedMergeCount: number, canMerge: boolean): string {
  if (!canMerge) {
    return "Nothing new to merge with the current selection. Enable overwrite on existing outputs or go back.";
  }

  return `${plannedMergeCount} camera output${plannedMergeCount !== 1 ? "s" : ""} will merge.\n\nReview categories and open a year below to adjust per-camera actions.\n\nUse **Start Merge** when you are ready.`;
}

function CategoryRow({
  title,
  count,
  icon,
  tintColor,
  category,
  review,
  canMerge,
  pushScreen,
}: {
  readonly title: string;
  readonly count: number;
  readonly icon: Icon;
  readonly tintColor: string;
  readonly category: MergeEventCategory;
  readonly review: MergeReviewStore;
  readonly canMerge: boolean;
  readonly pushScreen: (component: ReactElement) => void;
}) {
  const { overwriteKeys, reviewedCategories } = useMergeReviewSnapshot(review);

  if (count === 0) {
    return null;
  }

  const categoryEvents = getEventsForCategory(review.categories, category);
  const reviewStatus = getCategoryReviewStatus(category, reviewedCategories);
  const reviewAccessory = getCategoryReviewListAccessory(reviewStatus);

  return (
    <List.Item
      title={title}
      icon={{ source: icon, tintColor }}
      accessories={[reviewAccessory, { icon: Icon.ChevronRight, tooltip: "View events" }]}
      detail={
        <List.Item.Detail
          markdown={getCategoryStatusIntroMarkdown(category, reviewStatus)}
          metadata={
            <CategoryStatusMetadata
              category={category}
              events={categoryEvents}
              overwriteKeys={overwriteKeys}
              reviewStatus={reviewStatus}
            />
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={`View ${title}`}
            icon={Icon.ArrowRight}
            onAction={() =>
              pushScreen(<MergeSectionView category={category} review={review} pushScreen={pushScreen} />)
            }
          />
          {buildCategoryBulkActions(category, categoryEvents, review)}
          <Action
            title={canMerge ? "Start Merge" : "Nothing to Merge"}
            icon={Icon.Play}
            onAction={review.confirmMerge}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders merge summary, category rows, all-clips entry, and per-year plan navigation.
 *
 * @param props - Review store, ffmpeg path for thumbnails, and nested `pushScreen`.
 * @returns Raycast `List` for pre-merge review.
 */
export function MergeOverview({ review, ffmpegPath, pushScreen }: MergeOverviewProps) {
  const { overwriteKeys, plannedMergeCount } = useMergeReviewSnapshot(review);
  const summary = summarizeMergeCategories(review.categories);
  const canMerge = plannedMergeCount > 0;
  const title = review.events.length === 1 ? "Merge Overview" : `Merge Overview (${review.events.length} events)`;
  const yearGroups = useMemo(() => groupEventsByYear(review.events), [review.events]);

  const existingJobCount = useMemo(
    () =>
      review.events.reduce(
        (count, event) =>
          count + (event.readiness?.jobs.filter((job) => job.isMergeable && job.hasExistingOutput).length ?? 0),
        0,
      ),
    [review.events],
  );

  const mergeSummarySubtitle =
    existingJobCount > 0
      ? `${existingJobCount} existing · ${overwriteKeys.size} set to overwrite`
      : `${plannedMergeCount} output${plannedMergeCount !== 1 ? "s" : ""} will merge`;

  return (
    <List navigationTitle={title} searchBarPlaceholder="Search..." isShowingDetail>
      <List.Section title="Review" subtitle={mergeSummarySubtitle}>
        <List.Item
          title="Merge Summary"
          subtitle={mergeSummarySubtitle}
          icon={{ source: Icon.Info, tintColor: MODERN_COLORS.primary }}
          detail={<List.Item.Detail markdown={buildMergeSummaryMarkdown(plannedMergeCount, canMerge)} />}
          actions={
            <ActionPanel>
              <Action
                title={canMerge ? "Start Merge" : "Nothing to Merge"}
                icon={Icon.Play}
                onAction={review.confirmMerge}
              />
              <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Categories">
        <CategoryRow
          title={getMergeCategoryLabel("partially-merged")}
          count={summary.partiallyMergedCount}
          icon={Icon.CircleProgress100}
          tintColor={MODERN_COLORS.warning}
          category="partially-merged"
          review={review}
          canMerge={canMerge}
          pushScreen={pushScreen}
        />
        <CategoryRow
          title={getMergeCategoryLabel("already-merged")}
          count={summary.alreadyMergedCount}
          icon={Icon.CheckCircle}
          tintColor={MODERN_COLORS.success}
          category="already-merged"
          review={review}
          canMerge={canMerge}
          pushScreen={pushScreen}
        />
        <CategoryRow
          title={getMergeCategoryLabel("timeline-gaps")}
          count={summary.timelineGapsCount}
          icon={Icon.Warning}
          tintColor={MODERN_COLORS.warning}
          category="timeline-gaps"
          review={review}
          canMerge={canMerge}
          pushScreen={pushScreen}
        />
      </List.Section>

      <List.Section title="Clips" subtitle={`${review.events.length} event${review.events.length !== 1 ? "s" : ""}`}>
        <List.Item
          title="All Clips"
          icon={{ source: Icon.Layers, tintColor: MODERN_COLORS.primary }}
          accessories={[{ icon: Icon.ChevronRight, tooltip: "View flat list of all clips" }]}
          detail={
            <List.Item.Detail
              markdown={`Browse all **${review.events.length}** event${review.events.length !== 1 ? "s" : ""} as a flat list sorted newest first.\n\n**${plannedMergeCount}** camera output${plannedMergeCount !== 1 ? "s" : ""} will merge.`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="View All Clips"
                icon={Icon.ArrowRight}
                onAction={() =>
                  pushScreen(<MergeSectionAllClipsList review={review} ffmpegPath={ffmpegPath} canMerge={canMerge} />)
                }
              />
              <Action
                title={canMerge ? "Start Merge" : "Nothing to Merge"}
                icon={Icon.Play}
                onAction={review.confirmMerge}
              />
              <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Years" subtitle={`${yearGroups.length} year${yearGroups.length !== 1 ? "s" : ""}`}>
        {yearGroups.map((yearGroup) => (
          <YearGroupListItem
            key={yearGroup.yearKey}
            yearGroup={yearGroup}
            onView={() =>
              pushScreen(
                <MergePlanYearDays yearGroup={yearGroup} review={review} canMerge={canMerge} pushScreen={pushScreen} />,
              )
            }
            footerActions={[
              <Action
                key="start-merge"
                title={canMerge ? "Start Merge" : "Nothing to Merge"}
                icon={Icon.Play}
                onAction={review.confirmMerge}
              />,
              <Action key="cancel" title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelMerge} />,
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
