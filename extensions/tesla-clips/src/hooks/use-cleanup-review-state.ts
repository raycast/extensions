/**
 * React bindings for the cleanup review external store.
 *
 * @module hooks/use-cleanup-review-state
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  createCleanupReviewStore,
  type CleanupReviewSnapshot,
  type CleanupReviewStore,
} from "../lib/cleanup-review-store";
import type { TeslaEvent } from "../types";

export type { CleanupReviewSnapshot, CleanupReviewStore };

/**
 * Creates a stable cleanup review store for the given events and callbacks.
 *
 * @param events - Events eligible for merged-output removal.
 * @param onConfirm - Called with the user-selected subset when removal is confirmed.
 * @param onCancel - Called when the user cancels the review flow.
 * @returns {@link CleanupReviewStore} instance (selection toggles, confirm/cancel).
 */
export function useCleanupReviewStore(
  events: readonly TeslaEvent[],
  onConfirm: (selectedEvents: readonly TeslaEvent[]) => void,
  onCancel: () => void,
): CleanupReviewStore {
  return useMemo(() => createCleanupReviewStore(events, onConfirm, onCancel), [events, onConfirm, onCancel]);
}

/**
 * Subscribes to cleanup review store updates for React rendering.
 *
 * @param review - Store from {@link useCleanupReviewStore}.
 * @returns Current {@link CleanupReviewSnapshot} (`selectedEventIds`, `selectedCount`, etc.).
 */
export function useCleanupReviewSnapshot(review: CleanupReviewStore): CleanupReviewSnapshot {
  return useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
}
