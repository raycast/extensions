import { afterEach, describe, expect, it, vi } from "vitest";

import { buildDayHistory } from "@/lib/day-history";

afterEach(() => {
  vi.useRealTimers();
});

function localDate(day: number, hours = 0): Date {
  return new Date(2026, 9, day, hours);
}

function affectedDays(spans: Parameters<typeof buildDayHistory>[0]) {
  return buildDayHistory(spans, 10)
    .filter((day) => day.level !== "operational")
    .map((day) => day.date);
}

describe("buildDayHistory", () => {
  it("does not mark the next day when an outage ends at midnight", () => {
    vi.useFakeTimers({ now: localDate(20, 12), toFake: ["Date"] });

    expect(
      affectedDays([
        { start: localDate(14, 22), end: localDate(15), level: "major" },
      ]),
    ).toEqual(["2026-10-14"]);
  });

  it("marks every day an outage touches", () => {
    vi.useFakeTimers({ now: localDate(20, 12), toFake: ["Date"] });

    expect(
      affectedDays([
        { start: localDate(14, 22), end: localDate(15, 1), level: "major" },
        { start: localDate(17, 9), end: localDate(17, 9), level: "degraded" },
      ]),
    ).toEqual(["2026-10-14", "2026-10-15", "2026-10-17"]);
  });
});
