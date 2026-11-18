import { describe, it, expect } from "vitest";
import { formatDate, parseApiDate } from "../utils/formatDate";

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2024-03-15T10:30:00Z");
    // Should contain day, month name, year, and time
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("returns original string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("returns original string for empty string", () => {
    // new Date("") is Invalid Date
    expect(formatDate("")).toBe("");
  });

  it("handles date-only strings", () => {
    const result = formatDate("2024-01-01");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1/); // day
  });

  it("formats dates in Portuguese locale", () => {
    const result = formatDate("2024-06-15T14:00:00Z");
    // pt-PT puts the day first. The month name used to be the locale signal,
    // but the format is now numeric to fit Raycast's Published label, so
    // ordering is what distinguishes pt-PT from en-US (which gives 6/15/2024).
    expect(result).toMatch(/^15\/06\/2024, /);
  });
});

describe("parseApiDate", () => {
  it("trusts an explicit offset", () => {
    // /api/list/ultimas sends this form.
    expect(parseApiDate("2026-08-06T00:30:00+01:00")?.toISOString()).toBe(
      "2026-08-05T23:30:00.000Z",
    );
  });

  it("reads an offsetless summer timestamp as Lisbon, which is UTC+1", () => {
    // /api/list/opiniao and /api/content/news/{id} send this form for the
    // same instant. Without normalization it was read as machine-local, so
    // the two feeds disagreed anywhere but UTC+1.
    expect(parseApiDate("2026-08-06T00:30:00")?.toISOString()).toBe(
      "2026-08-05T23:30:00.000Z",
    );
  });

  it("reads an offsetless winter timestamp as Lisbon, which is UTC+0", () => {
    // Lisbon observes DST, so a fixed offset would be wrong half the year.
    expect(parseApiDate("2026-01-15T12:00:00")?.toISOString()).toBe(
      "2026-01-15T12:00:00.000Z",
    );
  });

  it("returns null for unparseable input", () => {
    expect(parseApiDate("not-a-date")).toBeNull();
    expect(parseApiDate("")).toBeNull();
  });
});

describe("formatDate output shape", () => {
  it("stays short enough for the Published label", () => {
    // The long Portuguese form was 28 chars and Raycast elided its middle,
    // rendering the year as "agosto...26". Keep this under 20.
    const formatted = formatDate("2026-08-04T18:30:03+01:00");
    expect(formatted.length).toBeLessThan(20);
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
  });

  it("still renders in the reader's timezone", () => {
    // Same instant, both API shapes, must format identically.
    expect(formatDate("2026-08-04T18:30:03+01:00")).toBe(
      formatDate("2026-08-04T18:30:03"),
    );
  });
});
