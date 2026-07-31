/**
 * Mutable store for merge review overwrite keys and category review state.
 */

import { categorizeMergeEvents, type MergeEventCategories, type MergeEventCategory } from "./merge-categories";
import { buildInitialOverwriteKeys, countPlannedMerges, getMergeOutputKey } from "./merge-readiness";
import type { MergeOptions, TeslaEvent } from "../types";

/** Immutable snapshot for React subscriptions during merge review. */
export type MergeReviewSnapshot = {
  readonly overwriteKeys: ReadonlySet<string>;
  readonly plannedMergeCount: number;
  readonly reviewedCategories: ReadonlySet<MergeEventCategory>;
};

/**
 * Store API for merge review overwrite toggles, category review, and confirm/cancel.
 */
export type MergeReviewStore = {
  readonly events: readonly TeslaEvent[];
  readonly categories: MergeEventCategories;
  readonly mergeOptions: MergeOptions;
  getSnapshot: () => MergeReviewSnapshot;
  subscribe: (listener: () => void) => () => void;
  toggleOverwrite: (eventDir: string, camera: string) => void;
  toggleEventOverwrites: (event: TeslaEvent, overwrite: boolean) => void;
  toggleEventsOverwrites: (events: readonly TeslaEvent[], overwrite: boolean) => void;
  markCategoryReviewed: (category: MergeEventCategory) => void;
  selectAllOverwrites: () => void;
  skipAllExisting: () => void;
  confirmMerge: () => void;
  cancelMerge: () => void;
};

function buildSnapshot(
  events: readonly TeslaEvent[],
  overwriteKeys: ReadonlySet<string>,
  reviewedCategories: ReadonlySet<MergeEventCategory>,
): MergeReviewSnapshot {
  return {
    overwriteKeys,
    plannedMergeCount: countPlannedMerges(events, overwriteKeys),
    reviewedCategories,
  };
}

/** All merge event categories, used to mark every category reviewed at once. */
const ALL_MERGE_CATEGORIES: readonly MergeEventCategory[] = [
  "ready",
  "partially-merged",
  "already-merged",
  "timeline-gaps",
];

/**
 * Adds or removes one event's mergeable-existing-output overwrite keys from a set in place.
 *
 * Shared by the single-event and multi-event overwrite toggles.
 *
 * @param keys - Overwrite key set to mutate.
 * @param event - Event whose mergeable existing-output jobs should be toggled.
 * @param overwrite - `true` to add keys, `false` to remove them.
 */
function applyEventOverwriteToggle(keys: Set<string>, event: TeslaEvent, overwrite: boolean): void {
  for (const job of event.readiness?.jobs ?? []) {
    if (!job.isMergeable || !job.hasExistingOutput) {
      continue;
    }

    const key = getMergeOutputKey(event.eventDir, job.camera);
    if (overwrite) {
      keys.add(key);
    } else {
      keys.delete(key);
    }
  }
}

function markEventCategoriesReviewed(
  event: TeslaEvent,
  categories: MergeEventCategories,
  reviewedCategories: Set<MergeEventCategory>,
): void {
  if (categories.ready.some((candidate) => candidate.id === event.id)) {
    reviewedCategories.add("ready");
  }
  if (categories.partiallyMerged.some((candidate) => candidate.id === event.id)) {
    reviewedCategories.add("partially-merged");
  }
  if (categories.alreadyMerged.some((candidate) => candidate.id === event.id)) {
    reviewedCategories.add("already-merged");
  }
  if (categories.timelineGaps.some((candidate) => candidate.id === event.id)) {
    reviewedCategories.add("timeline-gaps");
  }
}

/**
 * Creates a merge review store seeded from merge options and event readiness.
 *
 * @param events - Events to review before merge.
 * @param mergeOptions - Base merge options (overwrite default applied to initial keys).
 * @param onConfirm - Called with final overwrite key set when merge is confirmed.
 * @param onCancel - Called when the user cancels review.
 * @returns Store instance for UI binding.
 */
export function createMergeReviewStore(
  events: readonly TeslaEvent[],
  mergeOptions: MergeOptions,
  onConfirm: (overwriteOutputs: ReadonlySet<string>) => void,
  onCancel: () => void,
): MergeReviewStore {
  let overwriteKeys = buildInitialOverwriteKeys(events, mergeOptions.overwriteExisting);
  let reviewedCategories = new Set<MergeEventCategory>();
  let snapshot = buildSnapshot(events, overwriteKeys, reviewedCategories);
  const listeners = new Set<() => void>();
  const categories = categorizeMergeEvents(events);

  const notify = (): void => {
    snapshot = buildSnapshot(events, overwriteKeys, reviewedCategories);
    for (const listener of listeners) {
      listener();
    }
  };

  const findEventByDir = (eventDir: string): TeslaEvent | undefined =>
    events.find((event) => event.eventDir === eventDir);

  return {
    events,
    categories,
    mergeOptions,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    toggleOverwrite: (eventDir: string, camera: string): void => {
      const key = getMergeOutputKey(eventDir, camera);
      const next = new Set(overwriteKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      overwriteKeys = next;
      const event = findEventByDir(eventDir);
      if (event) {
        markEventCategoriesReviewed(event, categories, reviewedCategories);
      }
      notify();
    },
    toggleEventOverwrites: (event: TeslaEvent, overwrite: boolean): void => {
      const next = new Set(overwriteKeys);
      applyEventOverwriteToggle(next, event, overwrite);
      overwriteKeys = next;
      markEventCategoriesReviewed(event, categories, reviewedCategories);
      notify();
    },
    toggleEventsOverwrites: (targetEvents: readonly TeslaEvent[], overwrite: boolean): void => {
      const next = new Set(overwriteKeys);
      for (const event of targetEvents) {
        applyEventOverwriteToggle(next, event, overwrite);
      }
      overwriteKeys = next;
      for (const event of targetEvents) {
        markEventCategoriesReviewed(event, categories, reviewedCategories);
      }
      notify();
    },
    markCategoryReviewed: (category: MergeEventCategory): void => {
      reviewedCategories.add(category);
      notify();
    },
    selectAllOverwrites: (): void => {
      overwriteKeys = buildInitialOverwriteKeys(events, true);
      reviewedCategories = new Set<MergeEventCategory>(ALL_MERGE_CATEGORIES);
      notify();
    },
    skipAllExisting: (): void => {
      overwriteKeys = new Set();
      reviewedCategories = new Set<MergeEventCategory>(ALL_MERGE_CATEGORIES);
      notify();
    },
    confirmMerge: (): void => {
      onConfirm(overwriteKeys);
    },
    cancelMerge: onCancel,
  };
}
