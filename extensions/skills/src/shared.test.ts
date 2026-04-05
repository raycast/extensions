import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeDate } from "./shared";

describe("formatRelativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for dates less than a minute ago", () => {
    expect(formatRelativeDate("2026-04-05T11:59:30Z")).toBe("just now");
  });

  it("returns minutes ago", () => {
    expect(formatRelativeDate("2026-04-05T11:55:00Z")).toBe("5 minutes ago");
  });

  it("returns singular minute", () => {
    expect(formatRelativeDate("2026-04-05T11:59:00Z")).toBe("1 minute ago");
  });

  it("returns hours ago", () => {
    expect(formatRelativeDate("2026-04-05T09:00:00Z")).toBe("3 hours ago");
  });

  it("returns days ago", () => {
    expect(formatRelativeDate("2026-04-02T12:00:00Z")).toBe("3 days ago");
  });

  it("returns months ago", () => {
    expect(formatRelativeDate("2026-01-05T12:00:00Z")).toBe("3 months ago");
  });

  it("returns years ago", () => {
    expect(formatRelativeDate("2024-04-05T12:00:00Z")).toBe("2 years ago");
  });

  it("returns singular forms correctly", () => {
    expect(formatRelativeDate("2025-04-05T12:00:00Z")).toBe("1 year ago");
    expect(formatRelativeDate("2026-03-05T12:00:00Z")).toBe("1 month ago");
    expect(formatRelativeDate("2026-04-04T12:00:00Z")).toBe("1 day ago");
    expect(formatRelativeDate("2026-04-05T11:00:00Z")).toBe("1 hour ago");
  });

  it("returns 'Unknown' for invalid date strings", () => {
    expect(formatRelativeDate("invalid-date")).toBe("Unknown");
    expect(formatRelativeDate("")).toBe("Unknown");
  });

  it("returns 'Unknown' for future dates", () => {
    expect(formatRelativeDate("2027-01-01T00:00:00Z")).toBe("Unknown");
  });

  it("returns '1 year ago' at the 360-day boundary instead of '12 months ago'", () => {
    // 364 days ago: months = floor(364/30) = 12, years = floor(12/12) = 1
    const d = new Date("2026-04-05T12:00:00Z");
    d.setDate(d.getDate() - 364);
    expect(formatRelativeDate(d.toISOString())).toBe("1 year ago");
  });
});
