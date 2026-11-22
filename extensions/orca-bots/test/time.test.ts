import { describe, expect, test } from "bun:test";
import { formatSince } from "../src/lib/time";

const NOW = 1_800_000_000_000;
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const since = (elapsedMs: number): string => formatSince(NOW - elapsedMs, NOW);

describe("formatSince", () => {
  test("says just now under one minute, without an ago suffix", () => {
    expect(since(0)).toBe("just now");
    expect(since(59 * SECOND)).toBe("just now");
  });

  test("switches to minutes at 60 s", () => {
    expect(since(60 * SECOND)).toBe("1m ago");
    expect(since(59 * MINUTE)).toBe("59m ago");
  });

  test("switches to hours at 60 min", () => {
    expect(since(60 * MINUTE)).toBe("1h ago");
    expect(since(23 * HOUR)).toBe("23h ago");
  });

  test("switches to days at 24 h", () => {
    expect(since(24 * HOUR)).toBe("1d ago");
    expect(since(50 * HOUR)).toBe("2d ago");
  });

  test("truncates instead of rounding up", () => {
    expect(since(59 * MINUTE + 59 * SECOND)).toBe("59m ago");
  });

  test("treats a start in the future as just now", () => {
    expect(since(-5 * MINUTE)).toBe("just now");
  });
});
