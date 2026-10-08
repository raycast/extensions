import { describe, expect, it } from "vitest";
import { formatAgo, formatSeconds, ordinal, secondsBetween, truncate } from "../src/lib/format";

describe("format", () => {
  it("formats durations", () => {
    expect(formatSeconds(42)).toBe("42s");
    expect(formatSeconds(14 * 60)).toBe("14m");
    expect(formatSeconds(2 * 3600)).toBe("2h");
    expect(formatSeconds(2 * 3600 + 5 * 60)).toBe("2h 5m");
  });
  it("reads ordinals", () =>
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal).join(" ")).toBe(
      "1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 101st",
    ));
  it("measures between timestamps", () =>
    expect(secondsBetween("2026-10-07T14:00:00Z", "2026-10-07T14:01:30Z")).toBe(90));
  it("is undefined without a start", () => expect(secondsBetween(undefined)).toBeUndefined());
  it("truncates with an ellipsis", () => expect(truncate("abcdef", 4)).toBe("abc…"));
  it("says how long ago in the largest whole unit", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    const ago = (seconds: number) => formatAgo(new Date(now.getTime() - seconds * 1000).toISOString(), now);
    expect([ago(20), ago(14 * 60), ago(10 * 3600 + 41 * 60), ago(63 * 3600)]).toEqual([
      "just now",
      "14m ago",
      "10h ago",
      "2d ago",
    ]);
  });
});
