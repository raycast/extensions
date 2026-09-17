/**
 * React bindings for the merge review external store (overwrite selections).
 *
 * @module hooks/use-merge-review-state
 */

import { useMemo, useRef, useSyncExternalStore } from "react";
import { createMergeReviewStore, type MergeReviewSnapshot, type MergeReviewStore } from "../lib/merge-review-store";
import type { MergeOptions, TeslaEvent } from "../types";

export type { MergeReviewSnapshot, MergeReviewStore };

/**
 * Creates a stable merge review store for events and merge options.
 *
 * @param events - Events included in this merge batch.
 * @param mergeOptions - Base merge preferences from Raycast settings.
 * @param onConfirm - Called with output keys to overwrite when merge is confirmed.
 * @param onCancel - Called when the user cancels the review flow.
 * @returns {@link MergeReviewStore} instance.
 */
export function useMergeReviewStore(
  events: readonly TeslaEvent[],
  mergeOptions: MergeOptions,
  onConfirm: (overwriteOutputs: ReadonlySet<string>) => void,
  onCancel: () => void,
): MergeReviewStore {
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  return useMemo(
    () =>
      createMergeReviewStore(
        events,
        mergeOptions,
        (overwriteOutputs) => onConfirmRef.current(overwriteOutputs),
        () => onCancelRef.current(),
      ),
    [events, mergeOptions],
  );
}

/**
 * Subscribes to merge review store updates for React rendering.
 *
 * @param review - Store from {@link useMergeReviewStore}.
 * @returns Current {@link MergeReviewSnapshot} (`overwriteKeys`, `plannedMergeCount`, etc.).
 */
export function useMergeReviewSnapshot(review: MergeReviewStore): MergeReviewSnapshot {
  return useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
}
