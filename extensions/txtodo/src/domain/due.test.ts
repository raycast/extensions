import { describe, expect, it } from "vitest";
import { formatRelativeDue, parseDueDate, resolveDueOption } from "./due";

describe("formatRelativeDue", () => {
  const today = new Date(2026, 4, 15);

  it("returns empty for null/undefined/empty", () => {
    expect(formatRelativeDue(null, today)).toBe("");
    expect(formatRelativeDue(undefined, today)).toBe("");
    expect(formatRelativeDue("", today)).toBe("");
  });

  it("returns 'Today' for today", () => {
    expect(formatRelativeDue("2026-05-15", today)).toBe("Today");
  });

  it("returns 'Tomorrow' for today + 1", () => {
    expect(formatRelativeDue("2026-05-16", today)).toBe("Tomorrow");
  });

  it("returns 'Yesterday' for today - 1", () => {
    expect(formatRelativeDue("2026-05-14", today)).toBe("Yesterday");
  });

  it("returns weekday short name for 2-6 days in the future", () => {
    expect(formatRelativeDue("2026-05-18", today)).toBe("Mon");
    expect(formatRelativeDue("2026-05-20", today)).toBe("Wed");
  });

  it("returns 'Last <weekday>' for 2-6 days in the past", () => {
    expect(formatRelativeDue("2026-05-13", today)).toBe("Last Wed");
  });

  it("returns 'Mon DD' for dates more than a week away", () => {
    expect(formatRelativeDue("2026-06-01", today)).toBe("Jun 1");
    expect(formatRelativeDue("2026-04-30", today)).toBe("Apr 30");
  });
});

describe("parseDueDate", () => {
  it("parses YYYY-MM-DD into a local Date", () => {
    const d = parseDueDate("2026-05-14");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(14);
  });

  it("returns null for null, undefined, or empty input", () => {
    expect(parseDueDate(null)).toBeNull();
    expect(parseDueDate(undefined)).toBeNull();
    expect(parseDueDate("")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseDueDate("not-a-date")).toBeNull();
    expect(parseDueDate("2026")).toBeNull();
  });
});

describe("resolveDueOption", () => {
  const friday = new Date(2026, 4, 15);
  const sunday = new Date(2026, 4, 17);
  const monday = new Date(2026, 4, 18);

  it("returns undefined for 'none'", () => {
    expect(resolveDueOption("none", friday)).toBeUndefined();
  });

  it("returns undefined for unknown option", () => {
    expect(resolveDueOption("blah", friday)).toBeUndefined();
  });

  it("'today' returns today's date", () => {
    expect(resolveDueOption("today", friday)).toBe("2026-05-15");
  });

  it("'tomorrow' returns today + 1", () => {
    expect(resolveDueOption("tomorrow", friday)).toBe("2026-05-16");
  });

  it("'end-of-week' on Friday returns next Sunday", () => {
    expect(resolveDueOption("end-of-week", friday)).toBe("2026-05-17");
  });

  it("'end-of-week' on Sunday returns the same day", () => {
    expect(resolveDueOption("end-of-week", sunday)).toBe("2026-05-17");
  });

  it("'next-monday' on Friday returns the upcoming Monday", () => {
    expect(resolveDueOption("next-monday", friday)).toBe("2026-05-18");
  });

  it("'next-monday' on Monday returns Monday a week later", () => {
    expect(resolveDueOption("next-monday", monday)).toBe("2026-05-25");
  });

  it("'in-2-weeks' returns today + 14 days", () => {
    expect(resolveDueOption("in-2-weeks", friday)).toBe("2026-05-29");
  });

  it("'end-of-month' returns the last day of the current month", () => {
    expect(resolveDueOption("end-of-month", friday)).toBe("2026-05-31");
  });

  it("'end-of-month' handles February in a leap year", () => {
    const feb15Leap = new Date(2024, 1, 15);
    expect(resolveDueOption("end-of-month", feb15Leap)).toBe("2024-02-29");
  });
});
