import { describe, expect, it } from "vitest";
import { addDays, isAfterDay, nextMonday } from "./date";

describe("addDays", () => {
  it("advances within a month", () => {
    expect(addDays("2026-08-11", 1)).toBe("2026-08-12");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("goes backwards for negative counts", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isAfterDay", () => {
  it("is true only for a later day", () => {
    expect(isAfterDay("2026-08-28", "2026-08-27")).toBe(true);
    expect(isAfterDay("2026-08-27", "2026-08-27")).toBe(false);
    // A rolled-over task sits before the viewed day and must be kept.
    expect(isAfterDay("2026-08-24", "2026-08-27")).toBe(false);
  });

  it("compares across month and year boundaries", () => {
    expect(isAfterDay("2026-09-01", "2026-08-31")).toBe(true);
    expect(isAfterDay("2027-01-01", "2026-12-31")).toBe(true);
    expect(isAfterDay("2026-08-31", "2026-09-01")).toBe(false);
  });
});

describe("nextMonday", () => {
  it("returns the following Monday, never the same day", () => {
    // 2026-08-10 is a Monday.
    expect(nextMonday("2026-08-10")).toBe("2026-08-17");
    expect(nextMonday("2026-08-11")).toBe("2026-08-17"); // Tuesday
    expect(nextMonday("2026-08-15")).toBe("2026-08-17"); // Saturday
    expect(nextMonday("2026-08-16")).toBe("2026-08-17"); // Sunday
  });
});
