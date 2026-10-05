import { describe, expect, it, vi } from "vitest";
import { countSelectedEvents, createCleanupReviewStore } from "../lib/cleanup-review-store";
import type { TeslaEvent } from "../types";

function makeEvent(id: string): TeslaEvent {
  return {
    id,
    eventDir: `/event/${id}`,
    sourceRoot: "/root",
    folderName: `2025-09-29_07-01-${id}`,
    totalSegments: 4,
    totalGaps: 0,
    cameras: [],
    readiness: {
      existingState: "complete",
      existingOutputCount: 4,
      mergeableCount: 4,
      pendingMergeCount: 0,
      hasMergedOutputDir: true,
      mergedOutputFileCount: 4,
      jobs: [],
    },
  };
}

describe("createCleanupReviewStore", () => {
  it("starts with all events selected", () => {
    const events = [makeEvent("1"), makeEvent("2")];
    const store = createCleanupReviewStore(events, vi.fn(), vi.fn());

    expect(store.getSnapshot().selectedCount).toBe(2);
    expect(store.isSelected("1")).toBe(true);
    expect(store.isSelected("2")).toBe(true);
  });

  it("toggles individual event selection", () => {
    const events = [makeEvent("1"), makeEvent("2")];
    const store = createCleanupReviewStore(events, vi.fn(), vi.fn());
    const listener = vi.fn();

    store.subscribe(listener);
    store.toggleEvent("1");

    expect(store.isSelected("1")).toBe(false);
    expect(store.getSnapshot().selectedCount).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("selects and deselects events in bulk", () => {
    const events = [makeEvent("1"), makeEvent("2"), makeEvent("3")];
    const store = createCleanupReviewStore(events, vi.fn(), vi.fn());

    store.setEventsSelected(events.slice(0, 2), false);
    expect(store.getSnapshot().selectedCount).toBe(1);
    expect(store.isSelected("3")).toBe(true);

    store.selectAll();
    expect(store.getSnapshot().selectedCount).toBe(3);

    store.deselectAll();
    expect(store.getSnapshot().selectedCount).toBe(0);
  });

  it("confirms only selected events", () => {
    const events = [makeEvent("1"), makeEvent("2")];
    const onConfirm = vi.fn();
    const store = createCleanupReviewStore(events, onConfirm, vi.fn());

    store.toggleEvent("2");
    store.confirmCleanup();

    expect(onConfirm).toHaveBeenCalledWith([events[0]]);
  });
});

describe("countSelectedEvents", () => {
  it("counts selected events in a subset", () => {
    const events = [makeEvent("1"), makeEvent("2"), makeEvent("3")];
    const selected = new Set(["1", "3"]);

    expect(countSelectedEvents(events, selected)).toBe(2);
  });
});
