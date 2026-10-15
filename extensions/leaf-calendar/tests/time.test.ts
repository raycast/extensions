import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  dayTitle,
  durationToApi,
  durationsUpTo,
  formatDuration,
  formatSpan,
  groupByDay,
  nextHalfHour,
  parseLeafTime,
  spanFromApi,
  slotsOf,
  spanToApi,
  splitStarts,
  toDateString,
  toIsoLocal,
} from "../src/lib/time";

// Leaf Calendar refuses times without an offset, so every zone's offset must come out right
const zone = process.env.TZ;
const useZone = (tz: string) => (process.env.TZ = tz);

beforeEach(() => useZone("America/New_York"));
afterEach(() => (process.env.TZ = zone));

describe("toIsoLocal", () => {
  it("writes the local time with its offset", () => {
    expect(toIsoLocal(new Date("2026-10-14T13:05:09Z"))).toBe("2026-10-14T09:05:09-04:00");
  });

  it("follows daylight saving time", () => {
    expect(toIsoLocal(new Date("2026-12-14T14:00:00Z"))).toBe("2026-12-14T09:00:00-05:00");
  });

  it("writes half-hour and positive offsets", () => {
    useZone("Asia/Kolkata");
    expect(toIsoLocal(new Date("2026-10-14T13:00:00Z"))).toBe("2026-10-14T18:30:00+05:30");
  });

  it("writes UTC as +00:00", () => {
    useZone("UTC");
    expect(toIsoLocal(new Date("2026-10-14T13:00:00Z"))).toBe("2026-10-14T13:00:00+00:00");
  });

  it("matches the pattern Leaf Calendar accepts", () => {
    const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?(Z|[+-]\d{2}:\d{2})$/;
    expect(toIsoLocal(new Date())).toMatch(pattern);
  });
});

describe("parseLeafTime", () => {
  it("reads a date as local midnight, not UTC", () => {
    const date = parseLeafTime("2026-10-14");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 14, 0]);
  });

  it("reads a time with an offset as that instant", () => {
    expect(parseLeafTime("2026-10-14T09:00:00-04:00").toISOString()).toBe("2026-10-14T13:00:00.000Z");
  });
});

describe("spanToApi", () => {
  it("sends two times with offsets for a timed event", () => {
    expect(spanToApi(new Date(2026, 9, 14, 9), new Date(2026, 9, 14, 10), false)).toEqual({
      start: "2026-10-14T09:00:00-04:00",
      end: "2026-10-14T10:00:00-04:00",
    });
  });

  it("sends the day after the last day as an all-day end", () => {
    expect(spanToApi(new Date(2026, 9, 14, 15), new Date(2026, 9, 14, 8), true)).toEqual({
      start: "2026-10-14",
      end: "2026-10-15",
    });
    expect(spanToApi(new Date(2026, 9, 30), new Date(2026, 10, 1), true)).toEqual({
      start: "2026-10-30",
      end: "2026-11-02",
    });
  });

  it("refuses an end before the start", () => {
    expect(() => spanToApi(new Date(2026, 9, 14, 10), new Date(2026, 9, 14, 10), false)).toThrow();
    expect(() => spanToApi(new Date(2026, 9, 15), new Date(2026, 9, 14), true)).toThrow();
  });

  it("round-trips with spanFromApi", () => {
    const allDay = { start: "2026-10-14", end: "2026-10-16", allDay: true };
    const { start, end } = spanFromApi(allDay);
    expect(spanToApi(start, end, true)).toEqual({ start: allDay.start, end: allDay.end });

    const timed = { start: "2026-10-14T09:00:00-04:00", end: "2026-10-14T09:30:00-04:00", allDay: false };
    const span = spanFromApi(timed);
    expect(spanToApi(span.start, span.end, false)).toEqual({ start: timed.start, end: timed.end });
  });
});

describe("durationToApi", () => {
  it("ends a timed event that many minutes after the start", () => {
    expect(durationToApi(new Date(2026, 9, 14, 23, 30), 90, false)).toEqual({
      start: "2026-10-14T23:30:00-04:00",
      end: "2026-10-15T01:00:00-04:00",
    });
  });

  it("makes an all-day event that many days long, end exclusive", () => {
    expect(durationToApi(new Date(2026, 9, 14, 15), 1, true)).toEqual({ start: "2026-10-14", end: "2026-10-15" });
    expect(durationToApi(new Date(2026, 9, 30), 3, true)).toEqual({ start: "2026-10-30", end: "2026-11-02" });
  });

  it("refuses a length that isn't a positive whole number", () => {
    expect(() => durationToApi(new Date(2026, 9, 14), 0, false)).toThrow();
    expect(() => durationToApi(new Date(2026, 9, 14), Number.NaN, false)).toThrow();
  });
});

describe("formatDuration", () => {
  it("reads minutes as hours and minutes", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(480)).toBe("8 h");
  });
});

describe("splitStarts", () => {
  it("lists every start a link's length fits from, in steps of that length", () => {
    const starts = splitStarts({ start: "2026-10-14T10:00:00-04:00", end: "2026-10-14T11:15:00-04:00" }, 30);
    expect(starts.map(toIsoLocal)).toEqual(["2026-10-14T10:00:00-04:00", "2026-10-14T10:30:00-04:00"]);
  });

  it("is empty when the time is shorter than the length", () => {
    expect(splitStarts({ start: "2026-10-14T10:00:00-04:00", end: "2026-10-14T10:20:00-04:00" }, 30)).toEqual([]);
  });
});

describe("slotsOf", () => {
  const stretch = { start: "2026-10-14T09:23:00-04:00", end: "2026-10-14T11:10:00-04:00" };

  it("splits a free stretch into slots that start on the clock's half hours", () => {
    expect(slotsOf(stretch, 30).map((s) => s.start)).toEqual([
      "2026-10-14T09:30:00-04:00",
      "2026-10-14T10:00:00-04:00",
      "2026-10-14T10:30:00-04:00",
    ]);
    expect(slotsOf(stretch, 30)[0].end).toBe("2026-10-14T10:00:00-04:00");
  });

  it("uses quarter hours for short slots and keeps longer slots on half hours", () => {
    expect(slotsOf(stretch, 15)[0].start).toBe("2026-10-14T09:30:00-04:00");
    expect(slotsOf({ ...stretch, start: "2026-10-14T09:05:00-04:00" }, 15)[0].start).toBe("2026-10-14T09:15:00-04:00");
    expect(slotsOf(stretch, 60).map((s) => s.start)).toEqual(["2026-10-14T09:30:00-04:00"]);
  });

  it("keeps the whole stretch for 0", () => {
    expect(slotsOf(stretch, 0)).toEqual([stretch]);
  });
});

describe("durationsUpTo", () => {
  it("keeps the usual durations that fit, and the whole time when it isn't one of them", () => {
    expect(durationsUpTo(50)).toEqual([15, 30, 45, 50]);
    expect(durationsUpTo(60)).toEqual([15, 30, 45, 60]);
    expect(durationsUpTo(10)).toEqual([10]);
  });
});

describe("nextHalfHour", () => {
  it("rounds up to :30 or the next hour", () => {
    expect(toIsoLocal(nextHalfHour(new Date(2026, 9, 14, 9, 10, 30)))).toBe("2026-10-14T09:30:00-04:00");
    expect(toIsoLocal(nextHalfHour(new Date(2026, 9, 14, 9, 30)))).toBe("2026-10-14T10:00:00-04:00");
    expect(toIsoLocal(nextHalfHour(new Date(2026, 9, 14, 23, 45)))).toBe("2026-10-15T00:00:00-04:00");
  });
});

describe("groupByDay", () => {
  const from = new Date(2026, 9, 14, 12);

  it("groups by local day in day order", () => {
    const groups = groupByDay(
      [
        { id: "a", start: "2026-10-14T09:00:00-04:00" },
        { id: "b", start: "2026-10-15" },
        { id: "c", start: "2026-10-14T23:30:00-04:00" },
        { id: "d", start: "2026-10-15T00:30:00-04:00" },
      ],
      from,
    );

    expect(groups.map((g) => [toDateString(g.day), g.items.map((i) => i.id)])).toEqual([
      ["2026-10-14", ["a", "c"]],
      ["2026-10-15", ["b", "d"]],
    ]);
  });

  it("puts an event that started before today under today", () => {
    const groups = groupByDay([{ id: "trip", start: "2026-10-10" }], from);
    expect(toDateString(groups[0].day)).toBe("2026-10-14");
  });

  it("uses the local day of a time from another zone", () => {
    const groups = groupByDay([{ start: "2026-10-15T02:00:00Z" }], from);
    expect(toDateString(groups[0].day)).toBe("2026-10-14");
  });
});

describe("dayTitle and formatSpan", () => {
  const now = new Date(2026, 9, 14, 12);
  const day = new Date(2026, 9, 14);

  it("names today and tomorrow", () => {
    expect(dayTitle(day, now)).toBe("Today");
    expect(dayTitle(new Date(2026, 9, 15), now)).toBe("Tomorrow");
    expect(dayTitle(new Date(2026, 9, 16), now, "en-US")).toBe("Friday, October 16");
  });

  it("shows a one-day all-day event as All day, and a longer one with its last day", () => {
    expect(formatSpan({ start: "2026-10-14", end: "2026-10-15", allDay: true }, day, "en-US")).toBe("All day");
    expect(formatSpan({ start: "2026-10-14", end: "2026-10-17", allDay: true }, day, "en-US")).toBe(
      "All day, until Oct 16",
    );
  });

  it("shows times, with dates for days other than the one shown", () => {
    const timed = { start: "2026-10-14T09:00:00-04:00", end: "2026-10-14T10:30:00-04:00", allDay: false };
    expect(formatSpan(timed, day, "en-US").replace(/\s/g, " ")).toBe("9:00 AM – 10:30 AM");

    const overnight = { start: "2026-10-13T22:00:00-04:00", end: "2026-10-14T02:00:00-04:00", allDay: false };
    expect(formatSpan(overnight, day, "en-US").replace(/\s/g, " ")).toBe("Oct 13 10:00 PM – Oct 14 2:00 AM");
  });
});
