import { describe, expect, it } from "vitest";
import {
  buildCleanupOverviewIntroMarkdown,
  categorizeCleanupEvents,
  countInvalidMergedFiles,
  summarizeCleanupTargets,
} from "../lib/cleanup-categories";
import type { TeslaEvent } from "../types";

function buildEvent(
  existingState: "none" | "partial" | "complete",
  options?: {
    hasMergedOutputDir?: boolean;
    mergedOutputFileCount?: number;
    existingOutputCount?: number;
  },
): TeslaEvent {
  return {
    id: "event-1",
    eventDir: "/root/event-1",
    sourceRoot: "/root",
    folderName: "2025-09-29_07-01-59",
    cameras: [],
    totalSegments: 2,
    totalGaps: 0,
    readiness: {
      existingState,
      existingOutputCount: options?.existingOutputCount ?? (existingState === "none" ? 0 : 1),
      mergeableCount: 2,
      pendingMergeCount: existingState === "complete" ? 0 : 1,
      hasMergedOutputDir: options?.hasMergedOutputDir ?? existingState !== "none",
      mergedOutputFileCount: options?.mergedOutputFileCount ?? (existingState === "none" ? 1 : 2),
      jobs: [],
    },
  };
}

describe("cleanup-categories", () => {
  it("categorizes cleanup targets", () => {
    const categories = categorizeCleanupEvents([
      buildEvent("complete"),
      buildEvent("partial"),
      buildEvent("none", { hasMergedOutputDir: true, existingOutputCount: 0, mergedOutputFileCount: 2 }),
    ]);

    expect(categories.fullyMerged).toHaveLength(1);
    expect(categories.partiallyMerged).toHaveLength(1);
    expect(categories.invalidOutputs).toHaveLength(1);
  });

  it("summarizes cleanup targets", () => {
    const summary = summarizeCleanupTargets([
      buildEvent("complete", { existingOutputCount: 4, mergedOutputFileCount: 4 }),
      buildEvent("partial", { existingOutputCount: 2, mergedOutputFileCount: 3 }),
    ]);

    expect(summary.eventCount).toBe(2);
    expect(summary.validOutputCount).toBe(6);
    expect(summary.invalidFileCount).toBe(1);
  });

  it("builds overview markdown and invalid file counts", () => {
    const event = buildEvent("partial", { existingOutputCount: 2, mergedOutputFileCount: 4 });
    expect(countInvalidMergedFiles(event)).toBe(2);
    expect(buildCleanupOverviewIntroMarkdown(summarizeCleanupTargets([event]))).toContain("Original split clips");
  });
});
