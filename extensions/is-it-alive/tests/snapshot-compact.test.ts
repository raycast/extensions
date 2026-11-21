import { describe, expect, it } from "vitest";

import { mapPool } from "@/lib/async-pool";
import { compactSnapshotForList } from "@/lib/snapshot-compact";
import type { StatusSnapshot } from "@/types";

describe("mapPool", () => {
  it("preserves order with a concurrency cap", async () => {
    const started: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const result = await mapPool([1, 2, 3, 4], 2, async (value) => {
      started.push(value);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return value * 10;
    });

    expect(result).toEqual([10, 20, 30, 40]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(started).toEqual([1, 2, 3, 4]);
  });
});

describe("compactSnapshotForList", () => {
  it("drops history, component rows, and incident bodies", () => {
    const snapshot: StatusSnapshot = {
      pageName: "Example",
      pageUrl: "https://status.example.com",
      overallDescription: "All Systems Operational",
      indicator: "none",
      fetchedAt: "2026-08-28T00:00:00.000Z",
      uptimePercent: 99.9,
      historyDays: [{ date: "2026-08-01", level: "operational" }],
      components: [
        {
          id: "api",
          name: "API",
          status: "operational",
          historyDays: [{ date: "2026-08-01", level: "operational" }],
        },
      ],
      incidents: [
        {
          id: "inc-1",
          name: "Outage",
          status: "investigating",
          impact: "major",
          updatedAt: "2026-08-28T00:00:00.000Z",
          body: "A".repeat(5000),
        },
      ],
    };

    expect(compactSnapshotForList(snapshot)).toEqual({
      pageName: "Example",
      pageUrl: "https://status.example.com",
      overallDescription: "All Systems Operational",
      indicator: "none",
      fetchedAt: "2026-08-28T00:00:00.000Z",
      components: [],
      incidents: [
        {
          id: "inc-1",
          name: "Outage",
          status: "investigating",
          impact: "major",
          updatedAt: "2026-08-28T00:00:00.000Z",
        },
      ],
    });
  });
});
