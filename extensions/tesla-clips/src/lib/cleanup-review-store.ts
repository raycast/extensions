/**
 * Mutable store for cleanup review event selection with subscribe/notify pattern.
 */

import type { TeslaEvent } from "../types";

/** Immutable snapshot of selected event ids for React subscriptions. */
export type CleanupReviewSnapshot = {
  readonly selectedEventIds: ReadonlySet<string>;
  readonly selectedCount: number;
};

/**
 * Store API for cleanup review list selection and confirm/cancel actions.
 */
export type CleanupReviewStore = {
  readonly events: readonly TeslaEvent[];
  getSnapshot: () => CleanupReviewSnapshot;
  subscribe: (listener: () => void) => () => void;
  isSelected: (eventId: string) => boolean;
  toggleEvent: (eventId: string) => void;
  setEventsSelected: (targetEvents: readonly TeslaEvent[], selected: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedEvents: () => TeslaEvent[];
  confirmCleanup: () => void;
  cancelCleanup: () => void;
};

function buildSnapshot(selectedEventIds: ReadonlySet<string>): CleanupReviewSnapshot {
  return {
    selectedEventIds,
    selectedCount: selectedEventIds.size,
  };
}

/**
 * Counts how many of the given events are in the selection set.
 *
 * @param events - Events to count against.
 * @param selectedEventIds - Current selection.
 * @returns Number of selected events from the list.
 */
export function countSelectedEvents(events: readonly TeslaEvent[], selectedEventIds: ReadonlySet<string>): number {
  return events.filter((event) => selectedEventIds.has(event.id)).length;
}

/**
 * Creates a cleanup review store with all events selected initially.
 *
 * @param events - Cleanup target events.
 * @param onConfirm - Called with selected events when the user confirms cleanup.
 * @param onCancel - Called when the user cancels the review flow.
 * @returns Store instance for UI binding.
 */
export function createCleanupReviewStore(
  events: readonly TeslaEvent[],
  onConfirm: (selectedEvents: readonly TeslaEvent[]) => void,
  onCancel: () => void,
): CleanupReviewStore {
  let selectedEventIds = new Set(events.map((event) => event.id));
  let snapshot = buildSnapshot(selectedEventIds);
  const listeners = new Set<() => void>();

  const notify = (): void => {
    snapshot = buildSnapshot(selectedEventIds);
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    events,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isSelected: (eventId: string): boolean => selectedEventIds.has(eventId),
    toggleEvent: (eventId: string): void => {
      const next = new Set(selectedEventIds);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      selectedEventIds = next;
      notify();
    },
    setEventsSelected: (targetEvents: readonly TeslaEvent[], selected: boolean): void => {
      const next = new Set(selectedEventIds);
      for (const event of targetEvents) {
        if (selected) {
          next.add(event.id);
        } else {
          next.delete(event.id);
        }
      }
      selectedEventIds = next;
      notify();
    },
    selectAll: (): void => {
      selectedEventIds = new Set(events.map((event) => event.id));
      notify();
    },
    deselectAll: (): void => {
      selectedEventIds = new Set();
      notify();
    },
    getSelectedEvents: (): TeslaEvent[] => events.filter((event) => selectedEventIds.has(event.id)),
    confirmCleanup: (): void => {
      onConfirm(events.filter((event) => selectedEventIds.has(event.id)));
    },
    cancelCleanup: onCancel,
  };
}
