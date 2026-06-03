/**
 * Entry screen for merged-output removal review.
 *
 * @module components/cleanup-review-navigator
 */

import { useCallback } from "react";
import { useNestedNavigation } from "../hooks/use-nested-navigation";
import { useCleanupReviewStore } from "../hooks/use-cleanup-review-state";
import { CleanupOverview } from "./cleanup-overview";
import type { TeslaEvent } from "../types";

/** Props for {@link CleanupReviewNavigator}. */
type CleanupReviewNavigatorProps = {
  readonly events: readonly TeslaEvent[];
  readonly ffmpegPath: string;
  readonly onStartRun: (selectedEvents: readonly TeslaEvent[]) => void;
};

/**
 * Renders {@link CleanupOverview} with selection store and nested navigation.
 *
 * @param props - Cleanup targets, thumbnail ffmpeg path, and run starter callback.
 * @returns Cleanup review root list.
 */
export function CleanupReviewNavigator({ events, ffmpegPath, onStartRun }: CleanupReviewNavigatorProps) {
  const { pushScreen, dismissStack } = useNestedNavigation();

  const handleConfirm = useCallback(
    (selectedEvents: readonly TeslaEvent[]) => {
      dismissStack();
      onStartRun(selectedEvents);
    },
    [dismissStack, onStartRun],
  );

  const handleCancel = useCallback(() => {
    dismissStack();
  }, [dismissStack]);

  const review = useCleanupReviewStore(events, handleConfirm, handleCancel);

  return <CleanupOverview review={review} ffmpegPath={ffmpegPath} pushScreen={pushScreen} />;
}
