/**
 * Shared cleanup-review helpers: selection accessories and bulk actions.
 *
 * @module components/cleanup-section-shared
 */

import type { ReactElement } from "react";
import { Action, Icon } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { countSelectedEvents } from "../lib/cleanup-review-store";
import { showCleanupSelectionFeedback } from "../lib/cleanup-review-feedback";
import { formatEventTitle } from "../lib/format-event";
import type { CleanupReviewStore } from "../hooks/use-cleanup-review-state";
import type { TeslaEvent } from "../types";

/**
 * List accessory for a single event's inclusion in removal.
 *
 * @param isSelected - Whether the event is selected for cleanup.
 * @returns Icon and tooltip for list accessories.
 */
export function getCleanupSelectionAccessory(isSelected: boolean): {
  icon: { source: Icon; tintColor: string };
  tooltip: string;
} {
  if (isSelected) {
    return {
      icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.warning },
      tooltip: "Selected for removal",
    };
  }

  return {
    icon: { source: Icon.Circle, tintColor: MODERN_COLORS.neutral },
    tooltip: "Excluded from removal",
  };
}

/**
 * List accessory summarizing partial or full selection within a group of events.
 *
 * @param events - Events in the group (year, day, or all clips).
 * @param selectedEventIds - Currently selected event ids.
 * @returns Icon and tooltip reflecting selection ratio.
 */
export function getCleanupGroupSelectionAccessory(
  events: readonly TeslaEvent[],
  selectedEventIds: ReadonlySet<string>,
): {
  icon: { source: Icon; tintColor: string };
  tooltip: string;
} {
  const selectedCount = countSelectedEvents(events, selectedEventIds);
  const totalCount = events.length;

  if (selectedCount === 0) {
    return {
      icon: { source: Icon.Circle, tintColor: MODERN_COLORS.neutral },
      tooltip: `None of ${totalCount} selected`,
    };
  }

  if (selectedCount === totalCount) {
    return {
      icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.warning },
      tooltip: `All ${totalCount} selected for removal`,
    };
  }

  return {
    icon: { source: Icon.CircleProgress50, tintColor: MODERN_COLORS.warning },
    tooltip: `${selectedCount} of ${totalCount} selected for removal`,
  };
}

/**
 * Builds select-all and deselect-all actions for a scoped group of events.
 *
 * @param targetEvents - Events affected by the bulk action.
 * @param review - Cleanup review store.
 * @param label - Human-readable scope label for action titles.
 * @returns Raycast `Action` elements for include/exclude all in scope.
 */
export function buildCleanupBulkActions(
  targetEvents: readonly TeslaEvent[],
  review: CleanupReviewStore,
  label: string,
): ReactElement[] {
  return [
    <Action
      key={`select-${label}`}
      title={`Remove All in ${label}`}
      icon={Icon.Trash}
      onAction={() => {
        review.setEventsSelected(targetEvents, true);
        void showCleanupSelectionFeedback(true, targetEvents.length, label);
      }}
    />,
    <Action
      key={`deselect-${label}`}
      title={`Exclude All in ${label}`}
      icon={Icon.Circle}
      onAction={() => {
        review.setEventsSelected(targetEvents, false);
        void showCleanupSelectionFeedback(false, targetEvents.length, label);
      }}
    />,
  ];
}

/**
 * Builds global select-all and deselect-all actions for the full cleanup review.
 *
 * @param review - Cleanup review store.
 * @returns Raycast actions for all clips in the review set.
 */
export function buildCleanupGlobalBulkActions(review: CleanupReviewStore): ReactElement[] {
  return [
    <Action
      key="select-all"
      title="Remove All Clips"
      icon={Icon.Trash}
      onAction={() => {
        review.selectAll();
        void showCleanupSelectionFeedback(true, review.events.length, "all clips");
      }}
    />,
    <Action
      key="deselect-all"
      title="Exclude All Clips"
      icon={Icon.Circle}
      onAction={() => {
        review.deselectAll();
        void showCleanupSelectionFeedback(false, review.events.length, "all clips");
      }}
    />,
  ];
}

/**
 * Builds the include/exclude toggle action for one event row.
 *
 * @param event - Event to toggle.
 * @param review - Cleanup review store.
 * @param isSelected - Current selection state.
 * @returns Single Raycast `Action` for toggling removal inclusion.
 */
export function buildCleanupEventToggleAction(
  event: TeslaEvent,
  review: CleanupReviewStore,
  isSelected: boolean,
): ReactElement {
  return (
    <Action
      title={isSelected ? "Exclude from Removal" : "Include in Removal"}
      icon={isSelected ? Icon.Circle : Icon.Trash}
      onAction={() => {
        review.toggleEvent(event.id);
        void showCleanupSelectionFeedback(!isSelected, 1, formatEventTitle(event.folderName));
      }}
    />
  );
}
