import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { relativeTime } from "./time";

describe("relativeTime", () => {
  const NOW = 1700000000000; // fixed reference timestamp

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps under 60 seconds ago", () => {
    expect(relativeTime(NOW - 30_000)).toBe("just now");
  });

  it("returns '2 minutes ago' for 2 minutes ago", () => {
    expect(relativeTime(NOW - 120_000)).toBe("2 minutes ago");
  });

  it("returns '1 minute ago' for exactly 1 minute ago", () => {
    expect(relativeTime(NOW - 60_000)).toBe("1 minute ago");
  });

  it("returns '1 hour ago' for 1 hour ago", () => {
    expect(relativeTime(NOW - 3_600_000)).toBe("1 hour ago");
  });

  it("returns '2 hours ago' for 2 hours ago", () => {
    expect(relativeTime(NOW - 7_200_000)).toBe("2 hours ago");
  });

  it("returns '1 day ago' for 1 day ago", () => {
    expect(relativeTime(NOW - 86_400_000)).toBe("1 day ago");
  });

  it("returns '2 days ago' for 2 days ago", () => {
    expect(relativeTime(NOW - 172_800_000)).toBe("2 days ago");
  });

  it("returns '' for undefined input", () => {
    expect(relativeTime(undefined)).toBe("");
  });

  it("returns '' for 0 timestamp", () => {
    expect(relativeTime(0)).toBe("");
  });
});
