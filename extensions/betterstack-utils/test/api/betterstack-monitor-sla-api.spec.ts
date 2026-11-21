import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({
    apiToken: "test-token",
  })),
}));

import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { buildAvailabilityWindows, toMonitorSla } from "@/api/betterstack-monitor-sla-api";

describe("toMonitorSla", () => {
  it("maps attributes", () => {
    const sla = toMonitorSla({
      id: "1",
      type: "monitor_sla",
      attributes: {
        availability: 99.98,
        total_downtime: 600,
        number_of_incidents: 3,
        longest_incident: 300,
        average_incident: 200,
      },
    });

    expect(sla).toEqual({
      availability: 99.98,
      totalDowntime: 600,
      numberOfIncidents: 3,
      longestIncident: 300,
      averageIncident: 200,
    });
  });

  it("defaults missing numeric attributes to zero", () => {
    const sla = toMonitorSla({ id: "1", type: "monitor_sla", attributes: {} });

    expect(sla).toEqual({
      availability: 0,
      totalDowntime: 0,
      numberOfIncidents: 0,
      longestIncident: 0,
      averageIncident: 0,
    });
  });
});

describe("buildAvailabilityWindows", () => {
  const now = DateTime.fromObject({ year: 2026, month: 7, day: 5 });

  it("returns the five labelled windows in order", () => {
    const windows = buildAvailabilityWindows(now);

    expect(windows.map((window) => window.label)).toEqual([
      "Today",
      "Last 7 days",
      "Last 30 days",
      "Last 365 days",
      "All time",
    ]);
  });

  it("computes the ranges relative to now", () => {
    const windows = buildAvailabilityWindows(now);

    expect(windows.map((window) => window.range)).toEqual([
      { from: "2026-07-05", to: "2026-07-05" },
      { from: "2026-06-28", to: "2026-07-05" },
      { from: "2026-06-05", to: "2026-07-05" },
      { from: "2025-07-05", to: "2026-07-05" },
      {},
    ]);
  });

  it("uses fixed day counts across short months and leap years", () => {
    const afterLeapDay = DateTime.fromObject({ year: 2028, month: 3, day: 15 });
    const windows = buildAvailabilityWindows(afterLeapDay);

    expect(windows[2].range).toEqual({ from: "2028-02-14", to: "2028-03-15" });
    expect(windows[3].range).toEqual({ from: "2027-03-16", to: "2028-03-15" });
  });

  it("includes the day count in the All time label when createdAt is known", () => {
    const createdAt = now.minus({ days: 100 }).toISO() ?? undefined;
    const windows = buildAvailabilityWindows(now, createdAt);

    expect(windows.at(-1)?.label).toBe("All time (Last 100 days)");
  });

  it("falls back to a plain All time label when createdAt is missing or invalid", () => {
    expect(buildAvailabilityWindows(now).at(-1)?.label).toBe("All time");
    expect(buildAvailabilityWindows(now, "not-a-date").at(-1)?.label).toBe("All time");
  });
});
