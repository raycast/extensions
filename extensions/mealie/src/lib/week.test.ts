import { describe, expect, it } from "vitest";
import { addDays, startOfWeek, toIsoDate, weekDays } from "./week";

describe("toIsoDate", () => {
  it("formats in local time, not UTC, so late evenings do not shift a day", () => {
    expect(toIsoDate(new Date(2026, 8, 1, 23, 30))).toBe("2026-09-01");
    expect(toIsoDate(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});

describe("startOfWeek", () => {
  it("returns Monday for a Wednesday", () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 2)))).toBe("2026-08-31");
  });

  it("returns the same day for a Monday", () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 7, 31)))).toBe("2026-08-31");
  });

  it("returns the previous Monday for a Sunday", () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 6)))).toBe("2026-08-31");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(toIsoDate(addDays(new Date(2026, 7, 31), 7))).toBe("2026-09-07");
  });

  it("goes backwards", () => {
    expect(toIsoDate(addDays(new Date(2026, 8, 1), -1))).toBe("2026-08-31");
  });
});

describe("weekDays", () => {
  it("returns seven days starting at the given Monday", () => {
    const days = weekDays(new Date(2026, 7, 31)).map(toIsoDate);
    expect(days).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });
});
