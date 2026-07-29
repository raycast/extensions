import { describe, expect, it } from "vitest";
import {
  categorizeMergeEvents,
  getCategoryDetailMarkdown,
  getCategoryReviewStatus,
  getCategoryStatusIntroMarkdown,
  getEventsForCategory,
  getMergeCategoryLabel,
  summarizeMergeCategories,
} from "../lib/merge-categories";
import type { TeslaEvent } from "../types";

function buildEvent(overrides: Partial<TeslaEvent> & Pick<TeslaEvent, "id">): TeslaEvent {
  return {
    eventDir: `/event/${overrides.id}`,
    sourceRoot: "/root",
    folderName: "2025-09-29_07-01-59",
    cameras: [],
    totalSegments: 4,
    totalGaps: 0,
    ...overrides,
  };
}

describe("merge-categories", () => {
  it("groups events into ready, partially merged, already merged, and timeline gap categories", () => {
    const ready = buildEvent({
      id: "ready",
      readiness: {
        existingState: "none",
        existingOutputCount: 0,
        mergeableCount: 2,
        pendingMergeCount: 2,
        jobs: [],
      },
    });
    const alreadyMerged = buildEvent({
      id: "done",
      readiness: {
        existingState: "complete",
        existingOutputCount: 2,
        mergeableCount: 2,
        pendingMergeCount: 0,
        jobs: [],
      },
    });
    const partiallyMerged = buildEvent({
      id: "partial",
      readiness: {
        existingState: "partial",
        existingOutputCount: 1,
        mergeableCount: 2,
        pendingMergeCount: 1,
        jobs: [],
      },
    });
    const withGaps = buildEvent({
      id: "gaps",
      totalGaps: 2,
      readiness: {
        existingState: "partial",
        existingOutputCount: 1,
        mergeableCount: 2,
        pendingMergeCount: 1,
        jobs: [],
      },
    });

    const categories = categorizeMergeEvents([ready, alreadyMerged, partiallyMerged, withGaps]);
    expect(categories.ready).toHaveLength(1);
    expect(categories.partiallyMerged).toHaveLength(2);
    expect(categories.alreadyMerged).toHaveLength(1);
    expect(categories.timelineGaps).toHaveLength(1);
    expect(summarizeMergeCategories(categories)).toEqual({
      readyCount: 1,
      partiallyMergedCount: 2,
      alreadyMergedCount: 1,
      timelineGapsCount: 1,
    });
    expect(getEventsForCategory(categories, "partially-merged").map((event) => event.id)).toEqual(["partial", "gaps"]);
    expect(getEventsForCategory(categories, "timeline-gaps")[0]?.id).toBe("gaps");
  });

  it("returns labels and detail markdown for every category", () => {
    expect(getMergeCategoryLabel("ready")).toBe("Ready to Merge");
    expect(getMergeCategoryLabel("partially-merged")).toBe("Partially Merged");
    expect(getMergeCategoryLabel("already-merged")).toBe("Already Merged");
    expect(getMergeCategoryLabel("timeline-gaps")).toBe("Timeline Gaps");

    expect(getCategoryDetailMarkdown("ready")).toContain("new camera outputs");
    expect(getCategoryDetailMarkdown("partially-merged")).toContain("already have merged output files");
    expect(getCategoryDetailMarkdown("already-merged")).toContain("overwrite");
    expect(getCategoryDetailMarkdown("timeline-gaps")).toContain("missing clip segments");
  });

  it("derives review status and category detail summaries", () => {
    expect(getCategoryReviewStatus("ready", new Set())).toBe("ready-to-merge");
    expect(getCategoryReviewStatus("partially-merged", new Set())).toBe("needs-review");
    expect(getCategoryReviewStatus("partially-merged", new Set(["partially-merged"]))).toBe("reviewed");

    const detail = getCategoryStatusIntroMarkdown("partially-merged", "needs-review");
    expect(detail).toContain("already have merged output files");
    expect(detail).toContain("Open this category to review events");
  });
});
