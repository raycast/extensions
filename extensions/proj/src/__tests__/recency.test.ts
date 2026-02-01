import { describe, expect, test } from "bun:test";
import {
  formatRelativeTime,
  getRecencyIndicator,
  isRecentProject,
  isStaleProject,
} from "../recency";

describe("formatRelativeTime", () => {
  test("returns 'just now' for recent timestamps", () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  test("returns minutes ago", () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  test("returns hours ago", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
  });

  test("returns days ago", () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
  });

  test("returns weeks ago", () => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(twoWeeksAgo)).toBe("2 weeks ago");
  });

  test("returns months ago", () => {
    const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(threeMonthsAgo)).toBe("3 months ago");
  });

  test("returns undefined for no timestamp", () => {
    expect(formatRelativeTime(undefined)).toBeUndefined();
  });
});

describe("getRecencyIndicator", () => {
  test("returns blue for today", () => {
    const now = Date.now();
    expect(getRecencyIndicator(now)).toBe("blue");
  });

  test("returns undefined for normal recency", () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(getRecencyIndicator(weekAgo)).toBeUndefined();
  });

  test("returns red for stale (90+ days)", () => {
    const stale = Date.now() - 100 * 24 * 60 * 60 * 1000;
    expect(getRecencyIndicator(stale)).toBe("red");
  });
});

describe("isRecentProject", () => {
  test("returns true for projects opened in last 7 days", () => {
    const recent = Date.now() - 3 * 24 * 60 * 60 * 1000;
    expect(isRecentProject(recent)).toBe(true);
  });

  test("returns false for older projects", () => {
    const old = Date.now() - 10 * 24 * 60 * 60 * 1000;
    expect(isRecentProject(old)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isRecentProject(undefined)).toBe(false);
  });
});

describe("isStaleProject", () => {
  test("returns true for projects not opened in 90+ days", () => {
    const stale = Date.now() - 100 * 24 * 60 * 60 * 1000;
    expect(isStaleProject(stale)).toBe(true);
  });

  test("returns false for recent projects", () => {
    const recent = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(isStaleProject(recent)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isStaleProject(undefined)).toBe(false);
  });
});
