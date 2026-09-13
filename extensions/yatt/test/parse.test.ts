import { describe, expect, it } from "vitest";
import { parseExpression } from "../src/core/parse";

const p = parseExpression;

describe("parseExpression", () => {
  it("empty", () => expect(p("")).toEqual({ errors: [] }));

  it("times", () => {
    expect(p("19").start).toEqual({ h: 19, m: 0 });
    expect(p("7").start).toEqual({ h: 7, m: 0 });
    expect(p("1900").start).toEqual({ h: 19, m: 0 });
    expect(p("19:30").start).toEqual({ h: 19, m: 30 });
    expect(p("19.30").start).toEqual({ h: 19, m: 30 });
    expect(p("7pm").start).toEqual({ h: 19, m: 0 });
    expect(p("7 pm").start).toEqual({ h: 19, m: 0 });
    expect(p("7p").start).toEqual({ h: 19, m: 0 });
    expect(p("7:30pm").start).toEqual({ h: 19, m: 30 });
    expect(p("12am").start).toEqual({ h: 0, m: 0 });
    expect(p("12pm").start).toEqual({ h: 12, m: 0 });
    expect(p("noon").start).toEqual({ h: 12, m: 0 });
    expect(p("midnight").start).toEqual({ h: 0, m: 0 });
  });

  it("invalid times are errors", () => {
    expect(p("25").errors.length).toBe(1);
    expect(p("1990").errors.length).toBe(1);
    expect(p("13pm").errors.length).toBe(1);
  });

  it("ranges", () => {
    expect(p("19-21")).toMatchObject({ start: { h: 19, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("19–21")).toMatchObject({ start: { h: 19, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("19 to 21")).toMatchObject({ start: { h: 19, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("19 21")).toMatchObject({ start: { h: 19, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("7-9pm")).toMatchObject({ start: { h: 19, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("11-1pm")).toMatchObject({ start: { h: 11, m: 0 }, end: { h: 13, m: 0 } });
    expect(p("9-5pm")).toMatchObject({ start: { h: 9, m: 0 }, end: { h: 17, m: 0 } });
    expect(p("12-2pm")).toMatchObject({ start: { h: 12, m: 0 }, end: { h: 14, m: 0 } });
    expect(p("9-11est")).toMatchObject({ start: { h: 9, m: 0 }, end: { h: 11, m: 0 }, zoneQuery: "est" });
    expect(p("19-21 22-23").errors).toContain("too many times");
    expect(p("7am-9pm")).toMatchObject({ start: { h: 7, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("1900-2100")).toMatchObject({ start: { h: 19, m: 0 }, end: { h: 21, m: 0 } });
    expect(p("22-2")).toMatchObject({ start: { h: 22, m: 0 }, end: { h: 2, m: 0 } });
    expect(p("9:30-10:15 utc")).toMatchObject({ start: { h: 9, m: 30 }, end: { h: 10, m: 15 }, zoneQuery: "utc" });
  });

  it("durations", () => {
    expect(p("19 +2h")).toMatchObject({ start: { h: 19, m: 0 }, duration: 120 });
    expect(p("19 2h")).toMatchObject({ duration: 120 });
    expect(p("19 90m")).toMatchObject({ duration: 90 });
    expect(p("19 1h30")).toMatchObject({ duration: 90 });
    expect(p("19 +1.5h")).toMatchObject({ duration: 90 });
    expect(p("9 2h 30m")).toMatchObject({ duration: 150 });
    expect(p("2h").errors).toContain("duration without a start time");
    expect(p("19-21 2h").errors).toContain("range and duration");
  });

  it("zones and order independence", () => {
    expect(p("19 utc")).toMatchObject({ start: { h: 19, m: 0 }, zoneQuery: "utc" });
    expect(p("utc 19")).toMatchObject({ start: { h: 19, m: 0 }, zoneQuery: "utc" });
    expect(p("new york 19-21")).toMatchObject({ zoneQuery: "new york", end: { h: 21, m: 0 } });
    expect(p("19-21z")).toMatchObject({ zoneQuery: "z", end: { h: 21, m: 0 } });
    expect(p("Europe/Berlin 9")).toMatchObject({ zoneQuery: "europe/berlin" });
    expect(p("sf")).toEqual({ errors: [], zoneQuery: "sf" });
    expect(p("ZRH")).toMatchObject({ zoneQuery: "zrh" });
  });

  it("fixed offsets", () => {
    expect(p("19 utc+2")).toMatchObject({ start: { h: 19, m: 0 }, fixedOffset: 120 });
    expect(p("gmt-5:30 9")).toMatchObject({ fixedOffset: -330 });
    expect(p("utc +0530 9")).toMatchObject({ fixedOffset: 330 });
  });

  it("dates", () => {
    expect(p("tomorrow 19 utc")).toMatchObject({ date: { kind: "tomorrow" } });
    expect(p("mon 9")).toMatchObject({ date: { kind: "weekday", weekday: 1 } });
    expect(p("thursday 17 et")).toMatchObject({ date: { kind: "weekday", weekday: 4 }, zoneQuery: "et" });
    expect(p("2026-10-29 17")).toMatchObject({ date: { kind: "ymd", y: 2026, m: 10, d: 29 } });
    expect(p("29 oct 17")).toMatchObject({ date: { kind: "md", m: 10, d: 29 }, start: { h: 17, m: 0 } });
    expect(p("oct 29 17")).toMatchObject({ date: { kind: "md", m: 10, d: 29 }, start: { h: 17, m: 0 } });
    expect(p("29/10 17")).toMatchObject({ date: { kind: "numeric", a: 29, b: 10 } });
    expect(p("29.10. 17")).toMatchObject({ date: { kind: "numeric", a: 29, b: 10 }, start: { h: 17, m: 0 } });
    expect(p("29.10.2026 17")).toMatchObject({ date: { kind: "numeric", a: 29, b: 10, y: 2026 } });
    expect(p("3.9 17")).toMatchObject({ date: { kind: "numeric", a: 3, b: 9 } });
    expect(p("19.30 utc")).toMatchObject({ start: { h: 19, m: 30 }, zoneQuery: "utc" });
    expect(p("9 augsburg")).toMatchObject({ start: { h: 9, m: 0 }, zoneQuery: "augsburg" });
    expect(p("marseille 9").date).toBeUndefined();
    expect(p("9 march")).toMatchObject({ date: { kind: "md", m: 3, d: 9 } });
    expect(p("mon tue 9").errors).toContain("more than one date");
    expect(p("sat 9")).toMatchObject({ date: { kind: "weekday", weekday: 6 }, dateToken: "sat" });
  });

  it("junk", () => {
    expect(p("19 21 23").errors).toContain("too many times");
    expect(p("19 xx").zoneQuery).toBe("xx");
    expect(p("19 4x").errors[0]).toMatch(/didn't understand/);
  });
});
