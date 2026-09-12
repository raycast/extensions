import { describe, expect, it, vi } from "vitest";
import { createMergeReviewStore } from "../lib/merge-review-store";
import { getMergeOutputKey } from "../lib/merge-readiness";
import type { MergeOptions, TeslaEvent } from "../types";

const mergeOptions: MergeOptions = {
  ffmpegPath: "ffmpeg",
  overwriteExisting: false,
  deleteSourceSegmentsAfterMerge: false,
};

const event: TeslaEvent = {
  id: "event-1",
  eventDir: "/event",
  sourceRoot: "/root",
  folderName: "2025-09-29_07-01-59",
  totalSegments: 4,
  totalGaps: 0,
  cameras: [],
  readiness: {
    existingState: "partial",
    existingOutputCount: 1,
    mergeableCount: 2,
    pendingMergeCount: 1,
    jobs: [
      {
        camera: "front",
        outputPath: "/event/merged/front.mp4",
        outputFilename: "front-2025-09-29_07-01-59.mp4",
        segmentCount: 2,
        hasExistingOutput: true,
        isMergeable: true,
      },
      {
        camera: "back",
        outputPath: "/event/merged/back.mp4",
        outputFilename: "back-2025-09-29_07-01-59.mp4",
        segmentCount: 2,
        hasExistingOutput: false,
        isMergeable: true,
      },
    ],
  },
};

describe("createMergeReviewStore", () => {
  it("returns a stable snapshot reference until overwrite selections change", () => {
    const store = createMergeReviewStore([event], mergeOptions, vi.fn(), vi.fn());

    const firstSnapshot = store.getSnapshot();
    const secondSnapshot = store.getSnapshot();

    expect(secondSnapshot).toBe(firstSnapshot);
    expect(firstSnapshot.plannedMergeCount).toBe(1);
  });

  it("notifies subscribers and refreshes snapshot when overwrite toggles change", () => {
    const store = createMergeReviewStore([event], mergeOptions, vi.fn(), vi.fn());
    const listener = vi.fn();

    store.subscribe(listener);
    const beforeToggle = store.getSnapshot();

    store.toggleOverwrite(event.eventDir, "front");
    const afterToggle = store.getSnapshot();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(afterToggle).not.toBe(beforeToggle);
    expect(afterToggle.plannedMergeCount).toBe(2);
    expect(afterToggle.overwriteKeys.has(getMergeOutputKey(event.eventDir, "front"))).toBe(true);

    store.toggleOverwrite(event.eventDir, "front");

    expect(store.getSnapshot().overwriteKeys.has(getMergeOutputKey(event.eventDir, "front"))).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("selects and clears overwrite keys in bulk", () => {
    const store = createMergeReviewStore([event], mergeOptions, vi.fn(), vi.fn());

    store.selectAllOverwrites();
    expect(store.getSnapshot().overwriteKeys.size).toBe(1);

    store.skipAllExisting();
    expect(store.getSnapshot().overwriteKeys.size).toBe(0);
    expect(store.getSnapshot().plannedMergeCount).toBe(1);
  });

  it("toggles overwrite keys for all existing cameras in an event", () => {
    const store = createMergeReviewStore([event], mergeOptions, vi.fn(), vi.fn());

    store.toggleEventOverwrites(event, true);
    expect(store.getSnapshot().overwriteKeys.has(getMergeOutputKey(event.eventDir, "front"))).toBe(true);

    store.toggleEventOverwrites(event, false);
    expect(store.getSnapshot().overwriteKeys.size).toBe(0);
  });

  it("toggles overwrite keys for all existing cameras across multiple events", () => {
    const secondEvent: TeslaEvent = {
      ...event,
      id: "event-2",
      eventDir: "/event-2",
      folderName: "2025-09-30_07-01-59",
      readiness: {
        existingState: "complete",
        existingOutputCount: 1,
        mergeableCount: 1,
        pendingMergeCount: 0,
        jobs: [
          {
            camera: "back",
            outputPath: "/event-2/merged/back.mp4",
            outputFilename: "back-2025-09-30_07-01-59.mp4",
            segmentCount: 2,
            hasExistingOutput: true,
            isMergeable: true,
          },
        ],
      },
    };
    const store = createMergeReviewStore([event, secondEvent], mergeOptions, vi.fn(), vi.fn());

    store.toggleEventsOverwrites([event, secondEvent], true);
    expect(store.getSnapshot().overwriteKeys.size).toBe(2);

    store.toggleEventsOverwrites([secondEvent], false);
    expect(store.getSnapshot().overwriteKeys.has(getMergeOutputKey(event.eventDir, "front"))).toBe(true);
    expect(store.getSnapshot().overwriteKeys.has(getMergeOutputKey(secondEvent.eventDir, "back"))).toBe(false);
  });

  it("passes overwrite keys to confirm handler", () => {
    const onConfirm = vi.fn();
    const store = createMergeReviewStore([event], mergeOptions, onConfirm, vi.fn());

    store.toggleOverwrite(event.eventDir, "front");
    store.confirmMerge();

    expect(onConfirm).toHaveBeenCalledWith(new Set([getMergeOutputKey(event.eventDir, "front")]));
  });

  it("tracks reviewed categories in the snapshot", () => {
    const store = createMergeReviewStore([event], mergeOptions, vi.fn(), vi.fn());

    expect(store.getSnapshot().reviewedCategories.has("partially-merged")).toBe(false);

    store.markCategoryReviewed("partially-merged");
    expect(store.getSnapshot().reviewedCategories.has("partially-merged")).toBe(true);
  });
});
