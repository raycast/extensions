/**
 * Entry screen for merge review: wires nested navigation to {@link MergeOverview}.
 *
 * @module components/merge-review-navigator
 */

import { useCallback } from "react";
import { useNestedNavigation } from "../hooks/use-nested-navigation";
import { useMergeReviewStore } from "../hooks/use-merge-review-state";
import { MergeOverview } from "./merge-overview";
import type { MergeOptions, TeslaEvent } from "../types";

/** Props for {@link MergeReviewNavigator}. */
type MergeReviewNavigatorProps = {
  readonly events: readonly TeslaEvent[];
  readonly mergeOptions: MergeOptions;
  readonly ffmpegPath: string;
  readonly onConfirm: (overwriteOutputs: ReadonlySet<string>) => void;
};

/**
 * Renders the merge overview with a review store and nested screen pushes.
 *
 * @param props - Target events, merge options, ffmpeg path, and confirm handler.
 * @returns {@link MergeOverview} rooted in nested navigation.
 */
export function MergeReviewNavigator({ events, mergeOptions, ffmpegPath, onConfirm }: MergeReviewNavigatorProps) {
  const { pushScreen, dismissStack } = useNestedNavigation();

  const handleConfirm = useCallback(
    (overwriteOutputs: ReadonlySet<string>) => {
      dismissStack();
      onConfirm(overwriteOutputs);
    },
    [dismissStack, onConfirm],
  );

  const handleCancel = useCallback(() => {
    dismissStack();
  }, [dismissStack]);

  const review = useMergeReviewStore(events, mergeOptions, handleConfirm, handleCancel);

  return <MergeOverview review={review} ffmpegPath={ffmpegPath} pushScreen={pushScreen} />;
}
