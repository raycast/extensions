import { describe, expect, it } from "vitest";
import { rangeOf } from "@/common/utils/collection-utils";
import { activeRange, buildCalendarMonths } from "@/domain/calendar-month";

describe("activeRange", () => {
  const lastFebruaryWeek = rangeOf(7).map((dayOffset) => new Date(2026, 1, 23 + dayOffset));
  const firstMarchWeek = rangeOf(7).map((dayOffset) => new Date(2026, 2, 2 + dayOffset));

  it("returns the leading in-month columns of a boundary week (February side)", () => {
    expect(activeRange(lastFebruaryWeek, { year: 2026, month: 1 })).toEqual({ firstDay: 0, lastDay: 5 });
  });

  it("returns the trailing in-month columns of a boundary week (March side)", () => {
    expect(activeRange(lastFebruaryWeek, { year: 2026, month: 2 })).toEqual({ firstDay: 6, lastDay: 6 });
  });

  it("returns the whole week when every day is in the month", () => {
    expect(activeRange(firstMarchWeek, { year: 2026, month: 2 })).toEqual({ firstDay: 0, lastDay: 6 });
  });
});

describe("buildCalendarMonths", () => {
  it("groups March 2026 into one month, boundary week first, ids in order", () => {
    const timeWindow = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 31, 23, 59, 59) };

    const months = buildCalendarMonths(timeWindow, []);

    expect(months).toHaveLength(1);
    expect(months[0].yearMonth).toEqual({ year: 2026, month: 2 });
    expect(months[0].weeks.map((week) => week.id)).toEqual([
      "2026-W09",
      "2026-W10",
      "2026-W11",
      "2026-W12",
      "2026-W13",
      "2026-W14",
    ]);
  });

  it("shares the boundary week by reference across adjacent months", () => {
    const timeWindow = { start: new Date(2026, 1, 1), end: new Date(2026, 2, 31, 23, 59, 59) };

    const months = buildCalendarMonths(timeWindow, []);
    const february = months.find((month) => month.yearMonth.month === 1);
    const march = months.find((month) => month.yearMonth.month === 2);
    const sharedInFebruary = february?.weeks.find((week) => week.id === "2026-W09");
    const sharedInMarch = march?.weeks.find((week) => week.id === "2026-W09");

    expect(sharedInFebruary).toBeDefined();
    expect(sharedInMarch).toBe(sharedInFebruary);
  });
});
