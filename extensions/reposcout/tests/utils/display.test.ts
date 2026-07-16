import { describe, expect, it } from "vitest";
import { formatRelativeTime, kindLabel } from "../../src/utils/display";

describe("formatRelativeTime", () => {
  const now = 1_000_000_000_000;
  const seconds = (n: number) => now - n * 1000;
  const minutes = (n: number) => now - n * 60 * 1000;
  const hours = (n: number) => now - n * 60 * 60 * 1000;
  const days = (n: number) => now - n * 24 * 60 * 60 * 1000;

  it("returns empty string for null", () => {
    expect(formatRelativeTime(null, now)).toBe("");
  });

  it("renders sub-minute ages as 'now'", () => {
    expect(formatRelativeTime(seconds(5), now)).toBe("now");
  });

  it("renders minutes, hours, and days", () => {
    expect(formatRelativeTime(minutes(5), now)).toBe("5m");
    expect(formatRelativeTime(hours(3), now)).toBe("3h");
    expect(formatRelativeTime(days(2), now)).toBe("2d");
  });

  it("renders weeks, months, and years", () => {
    expect(formatRelativeTime(days(10), now)).toBe("1w");
    expect(formatRelativeTime(days(60), now)).toBe("2mo");
    expect(formatRelativeTime(days(800), now)).toBe("2y");
  });

  it("treats future timestamps as 'now'", () => {
    expect(formatRelativeTime(now + 5000, now)).toBe("now");
  });
});

describe("kindLabel", () => {
  it("labels each repository kind", () => {
    expect(kindLabel("normal")).toBe("Repository");
    expect(kindLabel("worktree")).toBe("Worktree");
    expect(kindLabel("bare")).toBe("Bare");
  });
});
