import { describe, expect, it } from "vitest";
import { renderBlockDetail } from "./billingBlockDetail";

describe("renderBlockDetail", () => {
  it("renders projection and burn rate when available", () => {
    const markdown = renderBlockDetail({
      id: "2026-05-07T08:00:00.000Z",
      startTime: "2026-05-07T08:00:00.000Z",
      endTime: "2026-05-07T13:00:00.000Z",
      entries: 548,
      isActive: true,
      isGap: false,
      totalTokens: 36393794,
      costUSD: 32.96823109999999,
      models: ["claude-opus-4-7"],
      costPerHourUSD: 17.81829236256372,
      projectedCostUSD: 66.39,
      remainingMinutes: 113,
    });

    expect(markdown).toContain("# Current 5-Hour Block");
    expect(markdown).toContain("| Projected Cost | $66.39 |");
    expect(markdown).toContain("| Remaining | 1h 53m |");
  });
});
