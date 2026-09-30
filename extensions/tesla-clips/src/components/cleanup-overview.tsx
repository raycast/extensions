/**
 * Top-level cleanup review: selection summary, all clips, and year navigation.
 *
 * @module components/cleanup-overview
 */

import { useCallback, useMemo, type ReactElement } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { MODERN_COLORS } from "../constants";
import { useCleanupReviewSnapshot, type CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { CleanupOverviewMetadata } from "./event-detail";
import { groupEventsByYear } from "../lib/event-day-groups";
import { buildCleanupOverviewIntroMarkdown, summarizeCleanupTargets } from "../lib/cleanup-categories";
import { confirmCleanupMergedOutputs } from "../lib/cleanup-merged";
import {
  buildCleanupBulkActions,
  buildCleanupGlobalBulkActions,
  getCleanupGroupSelectionAccessory,
} from "./cleanup-section-shared";
import { CleanupSectionAllClipsList } from "./cleanup-section-all-clips-list";
import { CleanupSectionYearDays } from "./cleanup-section-year-days";
import { YearGroupListItem } from "./year-group-list-item";

/** Props for {@link CleanupOverview}. */
type CleanupOverviewProps = {
  readonly review: CleanupReviewStore;
  readonly ffmpegPath: string;
  readonly pushScreen: (component: ReactElement) => void;
};

/**
 * Renders removal summary, clip browser entry, and year-grouped selection UI.
 *
 * @param props - Cleanup review store, ffmpeg path, and nested `pushScreen`.
 * @returns Raycast `List` for merged-output removal review.
 */
export function CleanupOverview({ review, ffmpegPath, pushScreen }: CleanupOverviewProps) {
  const { selectedEventIds, selectedCount } = useCleanupReviewSnapshot(review);
  const selectedEvents = useMemo(() => review.getSelectedEvents(), [review, selectedCount, selectedEventIds]);
  const summary = useMemo(() => summarizeCleanupTargets(selectedEvents), [selectedEvents]);
  const yearGroups = useMemo(() => groupEventsByYear(review.events), [review.events]);
  const title =
    review.events.length === 1
      ? "Remove Overview"
      : `Remove Overview (${selectedCount}/${review.events.length} events)`;
  const yearCountLabel = `${yearGroups.length} year${yearGroups.length !== 1 ? "s" : ""}`;
  const canRemove = selectedCount > 0;

  const handleStartCleanup = useCallback(async () => {
    if (!canRemove) {
      await showFailureToast("Select at least one clip to remove.", { title: "Nothing selected" });
      return;
    }

    const confirmed = await confirmCleanupMergedOutputs(selectedCount);
    if (confirmed) {
      review.confirmCleanup();
    }
  }, [canRemove, review, selectedCount]);

  const startRemovalTitle = canRemove ? `Start Removal (${selectedCount})` : "Nothing Selected";

  return (
    <List navigationTitle={title} searchBarPlaceholder="Search..." isShowingDetail>
      <List.Section
        title="Review"
        subtitle={`${selectedCount} of ${review.events.length} selected · ${summary.eventCount} folders`}
      >
        <List.Item
          title="Removal Summary"
          icon={{ source: Icon.Trash, tintColor: MODERN_COLORS.warning }}
          detail={
            <List.Item.Detail
              markdown={buildCleanupOverviewIntroMarkdown(summary)}
              metadata={<CleanupOverviewMetadata summary={summary} />}
            />
          }
          actions={
            <ActionPanel>
              <Action title={startRemovalTitle} icon={Icon.Trash} onAction={() => void handleStartCleanup()} />
              {buildCleanupGlobalBulkActions(review)}
              <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelCleanup} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Clips" subtitle={`${selectedCount} of ${review.events.length} selected`}>
        <List.Item
          title="All Clips"
          icon={{ source: Icon.Layers, tintColor: MODERN_COLORS.primary }}
          accessories={[
            getCleanupGroupSelectionAccessory(review.events, selectedEventIds),
            { icon: Icon.ChevronRight, tooltip: "View flat list of all clips" },
          ]}
          detail={
            <List.Item.Detail
              markdown={`Browse all **${review.events.length}** clip${review.events.length !== 1 ? "s" : ""} as a flat list sorted newest first.\n\n**${selectedCount}** selected for removal.`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="View All Clips"
                icon={Icon.ArrowRight}
                onAction={() =>
                  pushScreen(
                    <CleanupSectionAllClipsList
                      review={review}
                      ffmpegPath={ffmpegPath}
                      onStartCleanup={() => void handleStartCleanup()}
                    />,
                  )
                }
              />
              {buildCleanupGlobalBulkActions(review)}
              <Action title={startRemovalTitle} icon={Icon.Trash} onAction={() => void handleStartCleanup()} />
              <Action title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelCleanup} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Years" subtitle={yearCountLabel}>
        {yearGroups.map((yearGroup) => (
          <YearGroupListItem
            key={yearGroup.yearKey}
            yearGroup={yearGroup}
            selectionAccessory={getCleanupGroupSelectionAccessory(yearGroup.events, selectedEventIds)}
            onView={() =>
              pushScreen(
                <CleanupSectionYearDays
                  yearGroup={yearGroup}
                  review={review}
                  ffmpegPath={ffmpegPath}
                  onStartCleanup={() => void handleStartCleanup()}
                  pushScreen={pushScreen}
                />,
              )
            }
            footerActions={[
              ...buildCleanupBulkActions(yearGroup.events, review, yearGroup.label),
              <Action
                key="start-removal"
                title={startRemovalTitle}
                icon={Icon.Trash}
                onAction={() => void handleStartCleanup()}
              />,
              <Action key="cancel" title="Cancel" icon={Icon.XMarkCircle} onAction={review.cancelCleanup} />,
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
