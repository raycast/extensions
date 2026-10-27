import { describe, expect, it } from "vitest";
import { parseDurationParts, parseRelativeTime } from "../src/lib/duration";
import { formatRelative, formatTime, parseTimeInput } from "../src/lib/timestamp";

const now = new Date("2026-10-04T12:00:00.000Z");

describe("duration", () => {
  it("parses compound durations", () => {
    expect(parseDurationParts("1d2h")).toEqual([
      { amount: 1, unit: "d" },
      { amount: 2, unit: "h" },
    ]);
    expect(parseDurationParts("an hour and 30 minutes")).toEqual([
      { amount: 1, unit: "h" },
      { amount: 30, unit: "m" },
    ]);
    expect(parseDurationParts("hello")).toBeUndefined();
    expect(parseDurationParts("10 parsecs")).toBeUndefined();
  });

  it("parses directions", () => {
    expect(parseRelativeTime("10 seconds ago")?.direction).toBe(-1);
    expect(parseRelativeTime("in 2 hours")?.direction).toBe(1);
    expect(parseRelativeTime("3 days from now")?.direction).toBe(1);
    expect(parseRelativeTime("+1h30m")?.direction).toBe(1);
    expect(parseRelativeTime("-2d")?.direction).toBe(-1);
    expect(parseRelativeTime("5m")?.direction).toBe(-1);
    expect(parseRelativeTime("in 2 hours ago")).toBeUndefined();
  });
});

describe("parseTimeInput", () => {
  it("returns now for empty input", () => {
    expect(parseTimeInput("", now)).toMatchObject({ kind: "now", date: now });
    expect(parseTimeInput("now", now).kind).toBe("now");
  });

  it("detects unix timestamp precision", () => {
    expect(parseTimeInput("1700000000", now)).toMatchObject({ kind: "unix-seconds" });
    expect(parseTimeInput("1700000000", now).date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(parseTimeInput("1700000000123", now).date.toISOString()).toBe("2023-11-14T22:13:20.123Z");
    expect(parseTimeInput("1700000000123456", now).kind).toBe("unix-microseconds");
    expect(parseTimeInput("1700000000123456789", now).date.toISOString()).toBe("2023-11-14T22:13:20.123Z");
    expect(parseTimeInput("0", now).date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("handles relative durations", () => {
    expect(parseTimeInput("10 seconds ago", now).date.toISOString()).toBe("2026-10-04T11:59:50.000Z");
    expect(parseTimeInput("1 day ago", now).date.toISOString()).toBe("2026-10-03T12:00:00.000Z");
    expect(parseTimeInput("in 1 week", now).date.toISOString()).toBe("2026-10-11T12:00:00.000Z");
    expect(parseTimeInput("1 day ago", now).label).toBe("1 day ago");
  });

  it("handles ISO date-times", () => {
    expect(parseTimeInput("2024-01-01T00:00:00Z", now)).toMatchObject({ kind: "iso", label: "ISO 8601" });
    expect(parseTimeInput("2024-01-01T08:00:00+08:00", now).date.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(parseTimeInput("2024-01-01", now).date.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("falls back to natural language", () => {
    expect(parseTimeInput("yesterday", now).kind).toBe("natural");
  });

  it("rejects garbage", () => {
    expect(() => parseTimeInput("not a date at all", now)).toThrow();
  });
});

describe("formatting", () => {
  it("formats all representations", () => {
    const formats = Object.fromEntries(
      formatTime(new Date("2023-11-14T22:13:20.000Z"), now).map((f) => [f.id, f.value]),
    );
    expect(formats["unix-seconds"]).toBe("1700000000");
    expect(formats["unix-milliseconds"]).toBe("1700000000000");
    expect(formats["iso-utc"]).toBe("2023-11-14T22:13:20.000Z");
    expect(formats["http"]).toBe("Tue, 14 Nov 2023 22:13:20 GMT");
  });

  it("formats relative times", () => {
    expect(formatRelative(new Date(now.getTime() - 10_000), now)).toBe("10 seconds ago");
    expect(formatRelative(new Date(now.getTime() - 86_400_000), now)).toBe("yesterday");
    expect(formatRelative(new Date(now.getTime() + 2 * 3_600_000), now)).toBe("in 2 hours");
    expect(formatRelative(now, now)).toBe("now");
  });
});

describe("review fixes", () => {
  it("clamps month additions to the end of the target month", () => {
    const jan31 = new Date(2026, 0, 31, 12, 0, 0);
    const result = parseTimeInput("in 1 month", jan31).date;
    expect([result.getMonth(), result.getDate()]).toEqual([1, 28]);
    const leap = parseTimeInput("in 1 month", new Date(2028, 0, 31, 12)).date;
    expect([leap.getMonth(), leap.getDate()]).toEqual([1, 29]);
    const back = parseTimeInput("1 month ago", new Date(2026, 2, 31, 12)).date;
    expect([back.getMonth(), back.getDate()]).toEqual([1, 28]);
  });

  it("lets the caller override the Unix unit", () => {
    expect(parseTimeInput("-10000000000", now).date.getUTCFullYear()).toBe(1653);
    expect(parseTimeInput("-10000000000", now, "milliseconds").date.toISOString()).toBe("1969-09-07T06:13:20.000Z");
    expect(parseTimeInput("1700000000", now, "milliseconds").kind).toBe("unix-milliseconds");
    expect(parseTimeInput("1700000000", now).label).toBe("Unix seconds (auto-detected)");
    expect(parseTimeInput("1700000000", now, "seconds").label).toBe("Unix seconds");
  });

  it("rejects durations beyond the supported date range", () => {
    expect(() => parseTimeInput("in 99999999 years", now)).toThrow(/range/);
  });
});
