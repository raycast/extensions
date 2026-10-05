import { describe, expect, it, vi } from "vitest";
import {
  buildTimeline,
  describeDayDifference,
  formatTimeInZone,
  getCitySnapshot,
  parseTimeQuery,
  parseTimeQueryResult,
  resolveTimeQueryEdit,
  shiftInstant,
} from "./time";

describe("parseTimeQuery", () => {
  const base = new Date("2026-09-04T15:38:00.000Z");

  it("interprets a clock time in the anchor timezone", () => {
    expect(parseTimeQuery("14:30", base, "Europe/Warsaw")?.toISOString()).toBe("2026-09-04T12:30:00.000Z");
  });

  it("supports 12-hour input", () => {
    expect(parseTimeQuery("9:15 pm", base, "Europe/Warsaw")?.toISOString()).toBe("2026-09-04T19:15:00.000Z");
  });

  it("supports tomorrow plus a clock time", () => {
    expect(parseTimeQuery("tomorrow 09:00", base, "Europe/Warsaw")?.toISOString()).toBe("2026-09-05T07:00:00.000Z");
  });

  it("supports relative movement", () => {
    expect(parseTimeQuery("+3h", base, "Europe/Warsaw")?.toISOString()).toBe("2026-09-04T18:38:00.000Z");
    expect(parseTimeQuery("-30m", base, "Europe/Warsaw")?.toISOString()).toBe("2026-09-04T15:08:00.000Z");
  });

  it.each([
    ["+1minute", "2026-09-04T15:39:00.000Z"],
    ["+2hrs", "2026-09-04T17:38:00.000Z"],
    ["-1day", "2026-09-03T15:38:00.000Z"],
  ])("keeps relative-unit aliases in sync for %s", (query, expected) => {
    expect(parseTimeQuery(query, base, "Europe/Warsaw")?.toISOString()).toBe(expected);
  });

  it.each(["+3", "+3 ho", "-30 mi"])("recognizes an unfinished relative query: %s", (query) => {
    expect(parseTimeQueryResult(query, base, "Europe/Warsaw")).toEqual({
      status: "invalid",
      reason: "incomplete",
    });
  });

  it("rejects relative movement outside the Date range", () => {
    expect(parseTimeQuery("+1000000000d", base, "Europe/Warsaw")).toBeUndefined();
  });

  it("returns undefined for incomplete or invalid input", () => {
    expect(parseTimeQuery("tomorrow", base, "Europe/Warsaw")).toBeUndefined();
    expect(parseTimeQuery("25:00", base, "Europe/Warsaw")).toBeUndefined();
  });

  it("rebases later clock edits on the instant selected by now", () => {
    vi.useFakeTimers();
    try {
      const liveMoment = new Date("2026-09-10T12:00:00.000Z");
      vi.setSystemTime(liveMoment);

      const nowEdit = resolveTimeQueryEdit("now", base, base, "Europe/Warsaw");
      expect(nowEdit.result).toEqual({ status: "valid", date: liveMoment });
      expect(nowEdit.queryBase).toEqual(liveMoment);
      expect(nowEdit.isLive).toBe(true);

      const clockEdit = resolveTimeQueryEdit("09:00", liveMoment, nowEdit.queryBase, "Europe/Warsaw");
      expect(clockEdit.result).toEqual({
        status: "valid",
        date: new Date("2026-09-10T07:00:00.000Z"),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a local time skipped by daylight saving time", () => {
    const beforeSpringForward = new Date("2026-03-28T23:00:00.000Z");
    expect(parseTimeQuery("02:30", beforeSpringForward, "Europe/Warsaw")).toBeUndefined();
  });

  it("rejects a local time repeated by daylight saving time", () => {
    const beforeFallBack = new Date("2026-10-24T22:00:00.000Z");
    expect(parseTimeQuery("02:30", beforeFallBack, "Europe/Warsaw")).toBeUndefined();
  });

  it("distinguishes incomplete, invalid, out-of-range, and unavailable input", () => {
    expect(parseTimeQueryResult("tomorrow", base, "Europe/Warsaw")).toEqual({
      status: "invalid",
      reason: "incomplete",
    });
    expect(parseTimeQueryResult("lunchtime", base, "Europe/Warsaw")).toEqual({
      status: "invalid",
      reason: "unrecognized",
    });
    expect(parseTimeQueryResult("25:00", base, "Europe/Warsaw")).toEqual({
      status: "invalid",
      reason: "out-of-range",
    });

    const beforeSpringForward = new Date("2026-03-28T23:00:00.000Z");
    expect(parseTimeQueryResult("02:30", beforeSpringForward, "Europe/Warsaw")).toEqual({
      status: "invalid",
      reason: "unavailable",
    });
  });
});

describe("timezone presentation", () => {
  const instant = new Date("2026-09-04T15:38:00.000Z");

  it("formats the same instant in each local timezone", () => {
    expect(formatTimeInZone(instant, "Europe/Warsaw", false)).toBe("05:38 PM");
    expect(formatTimeInZone(instant, "America/New_York", false)).toBe("11:38 AM");
    expect(formatTimeInZone(instant, "America/Los_Angeles", true)).toBe("08:38");
  });

  it("describes date boundaries relative to the anchor city", () => {
    const nearMidnight = new Date("2026-09-04T22:30:00.000Z");
    expect(describeDayDifference(nearMidnight, "Europe/Warsaw", "America/New_York")).toBe("Yesterday");
  });

  it("moves an instant without mutating it", () => {
    const shifted = shiftInstant(instant, 15);
    expect(shifted.toISOString()).toBe("2026-09-04T15:53:00.000Z");
    expect(instant.toISOString()).toBe("2026-09-04T15:38:00.000Z");
  });

  it("builds a fixed-width timeline with one visible marker", () => {
    const timeline = buildTimeline(instant, "America/New_York");
    expect([...timeline]).toHaveLength(24);
    expect(timeline.match(/●/g)).toHaveLength(1);
  });

  it("derives synchronized row presentation from one timezone snapshot", () => {
    expect(getCitySnapshot(instant, "America/New_York")).toEqual({
      daySerial: Date.UTC(2026, 8, 4) / 86_400_000,
      hour: 11 + 38 / 60,
      isWorkingHour: true,
      timeline: "···········●············",
    });
  });

  it("uses the same working-hours boundaries in every snapshot", () => {
    expect(getCitySnapshot(new Date("2026-09-04T07:00:00.000Z"), "Europe/Warsaw").isWorkingHour).toBe(true);
    expect(getCitySnapshot(new Date("2026-09-04T14:59:00.000Z"), "Europe/Warsaw").isWorkingHour).toBe(true);
    expect(getCitySnapshot(new Date("2026-09-04T15:00:00.000Z"), "Europe/Warsaw").isWorkingHour).toBe(false);
  });
});
