import { describe, expect, it } from "vitest";
import { buildSummaryMessage, buildTotals } from "../lib/results";
import type { RootMergeResult } from "../types";

function createRootResult(overrides: Partial<RootMergeResult> = {}): RootMergeResult {
  return {
    sourceRoot: "/Volumes/TeslaCam",
    outputBase: "/Volumes/TeslaCam/event/merged",
    eventsScanned: 2,
    eventsWithClips: 2,
    cameraJobs: 4,
    merged: 3,
    skippedSingle: 1,
    skippedExisting: 0,
    failed: 0,
    eventResults: [],
    ...overrides,
  };
}

describe("results", () => {
  it("aggregates totals across root results", () => {
    const totals = buildTotals([createRootResult(), createRootResult({ merged: 1, failed: 1, cameraJobs: 2 })]);
    expect(totals).toEqual({
      roots: 2,
      eventsScanned: 4,
      eventsWithClips: 4,
      cameraJobs: 6,
      merged: 4,
      skippedSingle: 2,
      skippedExisting: 0,
      failed: 1,
    });
  });

  it("builds a summary message", () => {
    const message = buildSummaryMessage(
      buildTotals([
        createRootResult({
          eventsScanned: 3,
          eventsWithClips: 2,
          merged: 5,
          skippedExisting: 1,
          skippedSingle: 2,
          failed: 0,
        }),
      ]),
    );
    expect(message).toContain("2/3 event folders with clips");
    expect(message).toContain("5 merged");
    expect(message).toContain("1 existing skipped");
    expect(message).toContain("2 single-segment skipped");
    expect(message).toContain("0 failed");
  });

  it("reports skipped existing outputs when nothing new merged", () => {
    const totals = buildTotals([
      createRootResult({
        eventsScanned: 4,
        eventsWithClips: 4,
        merged: 0,
        skippedExisting: 12,
        skippedSingle: 0,
        failed: 0,
        cameraJobs: 12,
      }),
    ]);

    expect(totals.skippedExisting).toBe(12);
    expect(buildSummaryMessage(totals)).toContain("0 merged");
    expect(buildSummaryMessage(totals)).toContain("12 existing skipped");
  });
});
