import { describe, it, expect, vi, afterEach } from "vitest";
import { groupByLetter, formatBirthday, isUpcomingBirthday } from "../helpers";
import { UnifiedContact } from "../types";

function makeContact(displayName: string, id = displayName): UnifiedContact {
  return { id, displayName, emails: [], phones: [] };
}

describe("groupByLetter", () => {
  it("groups contacts by their first letter", () => {
    const contacts = [
      makeContact("Alice"),
      makeContact("Bob"),
      makeContact("Anna"),
    ];
    const groups = groupByLetter(contacts);
    const letters = groups.map(([l]) => l);
    expect(letters).toContain("A");
    expect(letters).toContain("B");
    const aGroup = groups.find(([l]) => l === "A")![1];
    expect(aGroup.map((c) => c.displayName)).toEqual(["Alice", "Anna"]);
  });

  it("puts non-alpha first characters into '#'", () => {
    const contacts = [makeContact("123 Corp"), makeContact("Alice")];
    const groups = groupByLetter(contacts);
    const hash = groups.find(([l]) => l === "#");
    expect(hash).toBeDefined();
    expect(hash![1][0].displayName).toBe("123 Corp");
  });

  it("sorts '#' to the end", () => {
    const contacts = [
      makeContact("42nd Street"),
      makeContact("Zara"),
      makeContact("Apple"),
    ];
    const groups = groupByLetter(contacts);
    const last = groups[groups.length - 1];
    expect(last[0]).toBe("#");
  });

  it("sorts letter sections alphabetically", () => {
    const contacts = [
      makeContact("Zara"),
      makeContact("Alice"),
      makeContact("Mike"),
    ];
    const groups = groupByLetter(contacts);
    const letters = groups.map(([l]) => l);
    expect(letters).toEqual(["A", "M", "Z"]);
  });

  it("returns empty array for empty input", () => {
    expect(groupByLetter([])).toEqual([]);
  });
});

describe("formatBirthday", () => {
  it("returns a non-empty string for a full date with year", () => {
    const result = formatBirthday("1990-5-25");
    expect(result).toBeDefined();
    expect(result).toContain("25");
    expect(result!.length).toBeGreaterThan(0);
  });

  it("includes the year when year is present and > 1", () => {
    const result = formatBirthday("1990-5-25");
    expect(result).toContain("1990");
  });

  it("omits the year when year is 1 (Apple Contacts no-year sentinel)", () => {
    const result = formatBirthday("1-6-15");
    expect(result).toBeDefined();
    // Should not contain a 4-digit year
    expect(result).not.toMatch(/\d{4}/);
    expect(result).toContain("15");
  });

  it("omits the year when year is 0", () => {
    const result = formatBirthday("0-3-20");
    expect(result).toBeDefined();
    expect(result).toContain("20");
    // Should not contain a 4-digit year
    expect(result).not.toMatch(/\d{4}/);
  });

  it("handles two-part birthday (month-day only) and omits year", () => {
    const result = formatBirthday("6-15");
    expect(result).toBeDefined();
    expect(result).toContain("15");
    expect(result!.length).toBeGreaterThan(0);
  });

  it("returns undefined for undefined input", () => {
    expect(formatBirthday(undefined)).toBeUndefined();
  });

  it("returns the original string if format is unrecognised", () => {
    expect(formatBirthday("not-a-date")).toBe("not-a-date");
  });
});

describe("isUpcomingBirthday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for a birthday within 30 days", () => {
    const today = new Date(2026, 4, 26); // May 26, 2026
    vi.setSystemTime(today);
    // June 10 is 15 days away
    expect(isUpcomingBirthday("2000-6-10")).toBe(true);
  });

  it("returns true for a birthday exactly today", () => {
    const today = new Date(2026, 4, 26); // May 26, 2026
    vi.setSystemTime(today);
    expect(isUpcomingBirthday("2000-5-26")).toBe(true);
  });

  it("returns false for a birthday more than 30 days away", () => {
    const today = new Date(2026, 4, 26); // May 26, 2026
    vi.setSystemTime(today);
    // July 1 is 36 days away
    expect(isUpcomingBirthday("2000-7-1")).toBe(false);
  });

  it("returns false for a birthday that just passed (wraps to next year)", () => {
    const today = new Date(2026, 4, 26); // May 26, 2026
    vi.setSystemTime(today);
    // May 1 just passed — next occurrence is May 1, 2027 (340+ days away)
    expect(isUpcomingBirthday("2000-5-1")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isUpcomingBirthday(undefined)).toBe(false);
  });

  it("respects custom withinDays parameter", () => {
    const today = new Date(2026, 4, 26); // May 26, 2026
    vi.setSystemTime(today);
    // June 10 is 15 days away — within 20, not within 10
    expect(isUpcomingBirthday("2000-6-10", 20)).toBe(true);
    expect(isUpcomingBirthday("2000-6-10", 10)).toBe(false);
  });

  it("handles two-part birthday format (month-day only)", () => {
    const today = new Date(2026, 4, 26); // May 26, 2026
    vi.setSystemTime(today);
    expect(isUpcomingBirthday("6-5")).toBe(true);
  });
});
