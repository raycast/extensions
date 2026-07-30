/**
 * Merge category view: events on one day with overwrite controls.
 *
 * @module components/merge-section-day-view
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEventThumbnail } from "../hooks/use-event-thumbnail";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import { buildGapDetailMarkdown } from "../lib/gap-format";
import { formatEventTimeLabel, type EventDayGroup } from "../lib/event-day-groups";
import { formatEventClipCount, formatEventSearchKeywords } from "../lib/format-event";
import { showOverwriteScopeFeedback } from "../lib/merge-review-feedback";
import { getEventsForCategory, getMergeCategoryLabel, type MergeEventCategory } from "../lib/merge-categories";
import { countEventExistingMergeableJobs } from "../lib/merge-readiness";
import type { MergeReviewStore } from "../hooks/use-merge-review-state";
import { useMergeReviewSnapshot } from "../hooks/use-merge-review-state";
import { buildEventDetailMarkdown } from "../lib/thumbnail";
import type { TeslaEvent } from "../types";
import { EventDetailMetadata } from "./event-detail";
import {
  buildAlreadyMergedDetailMarkdown,
  buildCategoryReviewFooterActions,
  buildOverwriteActions,
  buildPartiallyMergedDetailMarkdown,
  getSectionAccessory,
} from "./merge-section-shared";

/** Props for {@link MergeSectionDayView}. */
type MergeSectionDayViewProps = {
  readonly category: MergeEventCategory;
  readonly dayGroup: EventDayGroup;
  readonly review: MergeReviewStore;
};

function buildSupplementaryMarkdown(
  category: MergeEventCategory,
  event: TeslaEvent,
  overwriteKeys: ReadonlySet<string>,
): string | undefined {
  switch (category) {
    case "timeline-gaps":
      return buildGapDetailMarkdown(event);
    case "already-merged":
      return buildAlreadyMergedDetailMarkdown(event, overwriteKeys);
    case "partially-merged":
      return buildPartiallyMergedDetailMarkdown(event, overwriteKeys);
    case "ready":
      return undefined;
    default: {
      const _exhaustive: never = category;
      throw new Error(`Unhandled MergeEventCategory: ${String(_exhaustive)}`);
    }
  }
}

function MergeSectionDayEventItem({
  event,
  category,
  review,
  categoryEvents,
  overwriteKeys,
}: {
  readonly event: TeslaEvent;
  readonly category: MergeEventCategory;
  readonly review: MergeReviewStore;
  readonly categoryEvents: readonly TeslaEvent[];
  readonly overwriteKeys: ReadonlySet<string>;
}) {
  const { pop } = useNavigation();
  const accessory = getSectionAccessory(category, event, overwriteKeys);
  const status = getEventDisplayStatus(event, new Map(), undefined);
  const listIcon = getEventListIcon(status);
  const thumbnailPath = useEventThumbnail(event, review.mergeOptions.ffmpegPath);
  const supplementaryMarkdown = buildSupplementaryMarkdown(category, event, overwriteKeys);
  const detailMarkdown = supplementaryMarkdown
    ? `${buildEventDetailMarkdown(thumbnailPath)}\n\n---\n\n${supplementaryMarkdown}`
    : buildEventDetailMarkdown(thumbnailPath);

  return (
    <List.Item
      key={event.id}
      title={formatEventTimeLabel(event.folderName)}
      subtitle={formatEventClipCount(event.totalSegments)}
      keywords={formatEventSearchKeywords(event)}
      icon={listIcon}
      accessories={[{ icon: accessory.icon, tooltip: accessory.tooltip }]}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
          metadata={<EventDetailMetadata event={event} result={undefined} status={status} />}
        />
      }
      actions={
        <ActionPanel>
          {category === "already-merged" || category === "partially-merged"
            ? [
                <Action
                  key="overwrite-all"
                  title="Overwrite All Cameras in Event"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => {
                    const outputCount = countEventExistingMergeableJobs(event);
                    review.toggleEventOverwrites(event, true);
                    void showOverwriteScopeFeedback(true, outputCount, "event");
                  }}
                />,
                <Action
                  key="skip-all"
                  title="Skip All Cameras in Event"
                  icon={Icon.CheckCircle}
                  onAction={() => {
                    const outputCount = countEventExistingMergeableJobs(event);
                    review.toggleEventOverwrites(event, false);
                    void showOverwriteScopeFeedback(false, outputCount, "event");
                  }}
                />,
                ...buildOverwriteActions(event, review, overwriteKeys),
              ]
            : null}
          {buildCategoryReviewFooterActions(category, categoryEvents, review, pop)}
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders category-specific event rows for a single day (gaps, overwrites, partial merge).
 *
 * @param props - Category, day group, and review store.
 * @returns Raycast `List` of events for that day in the merge review flow.
 */
export function MergeSectionDayView({ category, dayGroup, review }: MergeSectionDayViewProps) {
  const { overwriteKeys } = useMergeReviewSnapshot(review);
  const title = `${getMergeCategoryLabel(category)} · ${dayGroup.label}`;
  const categoryEvents = getEventsForCategory(review.categories, category);

  return (
    <List navigationTitle={title} searchBarPlaceholder="Search events..." isShowingDetail>
      <List.Section>
        {dayGroup.events.map((event) => (
          <MergeSectionDayEventItem
            key={event.id}
            event={event}
            category={category}
            review={review}
            categoryEvents={categoryEvents}
            overwriteKeys={overwriteKeys}
          />
        ))}
      </List.Section>
    </List>
  );
}
