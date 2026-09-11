import { describe, expect, it } from "vitest";
import { buildGapDetailMarkdown, formatGapDuration } from "../lib/gap-format";
import type { TeslaEvent } from "../types";

describe("gap-format", () => {
  it("formats gap durations for display", () => {
    expect(formatGapDuration(45)).toBe("45s");
    expect(formatGapDuration(180)).toBe("3 min");
    expect(formatGapDuration(3900)).toBe("1h 5m");
  });

  it("builds gap detail markdown for an event", () => {
    const event: TeslaEvent = {
      id: "event-1",
      eventDir: "/event",
      sourceRoot: "/root",
      folderName: "2025-05-06_08-32-29",
      totalSegments: 4,
      totalGaps: 1,
      cameras: [
        {
          camera: "back",
          segments: [],
          gaps: [
            {
              beforeTimestamp: "2025-05-06_08-32-29",
              afterTimestamp: "2025-05-06_08-35-29",
              gapSeconds: 180,
            },
          ],
        },
      ],
    };

    const markdown = buildGapDetailMarkdown(event);
    expect(markdown).toContain("Back");
    expect(markdown).toContain("3 min missing");
  });
});
