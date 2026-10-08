import { afterEach, describe, expect, it } from "vitest";
import {
  addLocalDays,
  customRange,
  isWithin,
  localDayCount,
  parseRangeId,
  resolveRange,
  toUnixSeconds,
  utcDateWindow,
} from "./ranges";

const originalTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTz;
});

function local(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min);
}

describe("resolveRange (America/New_York)", () => {
  it("starts today at local midnight", () => {
    const now = local(2026, 10, 8, 15, 30);
    const range = resolveRange("today", now);
    expect(range.start).toEqual(local(2026, 10, 8));
    expect(range.start.toISOString()).toBe("2026-10-08T04:00:00.000Z");
    expect(range.end.getTime()).toBe(now.getTime() + 1);
    expect(range.label).toBe("Today");
  });

  it("counts the current day as one of the 7 and 30 days", () => {
    const now = local(2026, 10, 8, 9);
    expect(resolveRange("7d", now).start).toEqual(local(2026, 10, 2));
    expect(resolveRange("30d", now).start).toEqual(local(2026, 9, 9));
    expect(localDayCount(resolveRange("7d", now))).toBe(7);
    expect(localDayCount(resolveRange("30d", now))).toBe(30);
  });

  it("starts month to date on the 1st, including on the 1st itself", () => {
    expect(resolveRange("mtd", local(2026, 10, 8, 12)).start).toEqual(local(2026, 10, 1));
    expect(resolveRange("mtd", local(2026, 10, 1, 0, 5)).start).toEqual(local(2026, 10, 1));
  });

  it("crosses a month and year boundary", () => {
    const now = local(2027, 1, 3, 10);
    expect(resolveRange("7d", now).start).toEqual(local(2026, 12, 28));
    expect(resolveRange("mtd", now).start).toEqual(local(2027, 1, 1));
  });

  it("handles a leap day", () => {
    expect(resolveRange("7d", local(2028, 3, 2, 8)).start).toEqual(local(2028, 2, 25));
    // 2028 is a leap year: 29 days before 1 March is 1 February. In 2027 it is 31 January.
    expect(resolveRange("30d", local(2028, 3, 1, 8)).start).toEqual(local(2028, 2, 1));
    expect(resolveRange("30d", local(2027, 3, 1, 8)).start).toEqual(local(2027, 1, 31));
  });

  it("keeps local midnight across the spring-forward DST change (23-hour day)", () => {
    // DST starts 2026-03-08 at 02:00 in New York.
    const now = local(2026, 3, 8, 12);
    const today = resolveRange("today", now);
    expect(today.start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    const week = resolveRange("7d", now);
    expect(week.start.toISOString()).toBe("2026-03-02T05:00:00.000Z");
    expect(localDayCount(week)).toBe(7);
    // Monday after the change: midnight is now UTC-4.
    expect(resolveRange("today", local(2026, 3, 9, 1)).start.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("keeps local midnight across the fall-back DST change (25-hour day)", () => {
    // DST ends 2026-11-01 at 02:00 in New York.
    const now = local(2026, 11, 1, 23, 30);
    const today = resolveRange("today", now);
    expect(today.start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(now.getTime() - today.start.getTime()).toBe(24.5 * 3600 * 1000);
    expect(resolveRange("mtd", now).start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(resolveRange("7d", local(2026, 11, 3, 9)).start.toISOString()).toBe("2026-10-28T04:00:00.000Z");
  });

  it("works in a zone east of UTC", () => {
    process.env.TZ = "Asia/Tokyo";
    const now = new Date("2026-10-08T01:00:00.000Z"); // 10:00 in Tokyo
    expect(resolveRange("today", now).start.toISOString()).toBe("2026-10-07T15:00:00.000Z");
  });
});

describe("helpers", () => {
  it("parses range ids with a fallback", () => {
    expect(parseRangeId("mtd")).toBe("mtd");
    expect(parseRangeId("year")).toBe("today");
    expect(parseRangeId(undefined, "7d")).toBe("7d");
  });

  it("treats the start as inclusive and the end as exclusive", () => {
    const range = customRange(local(2026, 10, 1), local(2026, 10, 2));
    expect(isWithin(local(2026, 10, 1), range)).toBe(true);
    expect(isWithin(local(2026, 10, 2), range)).toBe(false);
    expect(() => customRange(local(2026, 10, 2), local(2026, 10, 1))).toThrow();
  });

  it("adds local days across DST", () => {
    expect(addLocalDays(local(2026, 3, 7), 1)).toEqual(local(2026, 3, 8));
    expect(addLocalDays(local(2026, 3, 8), 1).getTime() - local(2026, 3, 8).getTime()).toBe(23 * 3600 * 1000);
  });

  it("converts to unix seconds", () => {
    expect(toUnixSeconds(new Date("2026-10-08T00:00:00.999Z"))).toBe(1791417600);
  });

  it("builds the UTC date window Gumroad needs", () => {
    // Local New York day 2026-10-08 is 04:00Z on the 8th to 04:00Z on the 9th.
    const range = customRange(local(2026, 10, 8), local(2026, 10, 9));
    expect(utcDateWindow(range)).toEqual({ after: "2026-10-08", before: "2026-10-10" });
    // A range ending exactly at UTC midnight does not need the next day.
    const utcDay = customRange(new Date("2026-10-08T00:00:00Z"), new Date("2026-10-09T00:00:00Z"));
    expect(utcDateWindow(utcDay)).toEqual({ after: "2026-10-08", before: "2026-10-09" });
  });
});
