import { describe, expect, it } from "vitest";
import {
  buildMergeCompleteIntroMarkdown,
  buildMergeProgressTitle,
  summarizeEventMergeResult,
} from "../lib/merge-progress";
import type { EventMergeResult } from "../types";

describe("merge-progress", () => {
  it("summarizes per-event merge results", () => {
    const result: EventMergeResult = {
      eventDir: "/event",
      outputs: [
        { camera: "front", outputPath: "/event/merged/front.mp4", segmentCount: 2, status: "merged" },
        { camera: "back", outputPath: "/event/merged/back.mp4", segmentCount: 2, status: "skipped-existing" },
        { camera: "left_repeater", outputPath: "/event/merged/left.mp4", segmentCount: 1, status: "skipped-single" },
      ],
    };

    expect(summarizeEventMergeResult(result)).toBe("1 merged · 1 skipped · 1 single");
  });

  it("builds progress titles", () => {
    expect(buildMergeProgressTitle(0, 5)).toBe("Merging Events (0/5)");
    expect(buildMergeProgressTitle(0, 1)).toBe("Merging Event");
  });

  it("builds completion intro messages", () => {
    expect(buildMergeCompleteIntroMarkdown({ failed: 0, merged: 3 } as never, false)).toContain(
      "Successfully merged 3",
    );
    expect(buildMergeCompleteIntroMarkdown({ failed: 2, merged: 1 } as never, true)).toContain("errors");
  });
});
