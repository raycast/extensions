import { describe, expect, it } from "vitest";
import { parseHourRange, shadeOf, shadeOfWindow } from "../src/core/business";
import { dayShift, formatDuration, formatTime, formatWindow, relativeOffset, renderTemplate } from "../src/core/format";
import { loadLocationsFile, normalizeLocations, parseLocationsFile } from "../src/core/store";
import { fold } from "../src/core/text";
import { wallToInstant } from "../src/core/time";
import { renderStripSvg, stripText } from "../src/core/strip";
import { formatExpression, zoneTokenFor } from "../src/lib/expression";

describe("business hours", () => {
  const b = parseHourRange("9-18")!;
  const s = parseHourRange("7-21")!;
  it("parses", () => {
    expect(b).toEqual({ start: 9, end: 18 });
    expect(parseHourRange("9:30-17:30")).toEqual({ start: 9.5, end: 17.5 });
    expect(parseHourRange("nope")).toBeUndefined();
  });
  it("shades", () => {
    expect(shadeOf(12, b, s)).toBe("business");
    expect(shadeOf(8, b, s)).toBe("shoulder");
    expect(shadeOf(23, b, s)).toBe("off");
    expect(shadeOfWindow(16, 19, b, s)).toBe("shoulder");
    expect(shadeOfWindow(20, 22, b, s)).toBe("off");
    expect(shadeOfWindow(9, 12, b, s)).toBe("business");
  });
  it("overnight ranges", () => {
    const night = parseHourRange("22-6")!;
    expect(shadeOf(23, night, night)).toBe("business");
    expect(shadeOf(12, night, night)).toBe("off");
  });
});

describe("format", () => {
  const t = wallToInstant("UTC", 2026, 9, 1, 19, 0);
  it("times", () => {
    expect(formatTime(t, "UTC", "24h")).toBe("19:00");
    expect(formatTime(t, "UTC", "12h")).toBe("7:00 PM");
    expect(formatTime(t, "America/Los_Angeles", "24h")).toBe("12:00");
    expect(formatWindow(t, t + 7200000, "Europe/Berlin", "24h")).toBe("21:00–23:00");
  });
  it("durations", () => {
    expect(formatDuration(75 * 60000)).toBe("1h 15m");
    expect(formatDuration(120 * 60000)).toBe("2h");
    expect(formatDuration(45 * 60000)).toBe("45m");
  });
  it("day shift and offsets", () => {
    expect(dayShift(t, "Asia/Tokyo", "UTC")).toBe(1);
    expect(dayShift(t, "America/Los_Angeles", "UTC")).toBe(0);
    expect(relativeOffset(t, "Asia/Tokyo", "UTC")).toBe("+9h");
    expect(relativeOffset(t, "America/Los_Angeles", "Europe/Berlin")).toBe("−9h");
  });
  it("templates", () => {
    const utc = { time: "11:15", label: "UTC", code: "UTC", abbr: "", date: "", day: "", offset: "", tz: "UTC", dot: "" };
    expect(renderTemplate("{time} {label}", { ...utc, time: "19:00" })).toBe("19:00 UTC");
    expect(renderTemplate("{time} {nope}", { ...utc, time: "1" })).toBe("1 {nope}");
    expect(renderTemplate("{time} {code} ({abbr})", utc)).toBe("11:15 UTC");
    expect(renderTemplate("{time} {code} ({abbr})", { ...utc, code: "SFO", abbr: "PDT" })).toBe("11:15 SFO (PDT)");
    expect(renderTemplate("{dot} {code} {time}", { ...utc, dot: "🟢" })).toBe("🟢 UTC 11:15");
    expect(renderTemplate("{dot} {code} {time}", utc)).toBe("UTC 11:15");
  });
});

describe("store", () => {
  it("normalizes and dedupes", () => {
    const list = normalizeLocations([
      { id: "a", kind: "city", label: "A", tz: "UTC", aliases: ["X", "x", " y "], isHome: true },
      { id: "a", kind: "city", label: "dup", tz: "UTC", aliases: [] },
      { id: "b", kind: "zone", label: "B", tz: "UTC", aliases: [], isHome: true },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].aliases).toEqual(["x", "y"]);
    expect(list[1].isHome).toBe(false);
  });
  it("seeds an empty store but refuses to overwrite a damaged one", async () => {
    const seed = [{ id: "a", kind: "city" as const, label: "A", tz: "UTC", aliases: [] }];
    const writes: string[] = [];
    const backend = (text: string | undefined) => ({ read: async () => text, write: async (t: string) => void writes.push(t) });
    expect((await loadLocationsFile(backend(undefined), seed)).locations).toHaveLength(1);
    expect((await loadLocationsFile(backend("  "), seed)).locations).toHaveLength(1);
    expect(writes).toHaveLength(2);
    await expect(loadLocationsFile(backend("{ broken"), seed)).rejects.toThrow(/not valid/);
    expect(writes).toHaveLength(2);
  });
  it("parses both file shapes", () => {
    expect(parseLocationsFile('[{"id":"a","kind":"city","label":"A","tz":"UTC","aliases":[]}]')?.locations).toHaveLength(1);
    expect(parseLocationsFile('{"version":1,"locations":[]}')?.locations).toEqual([]);
    expect(parseLocationsFile("nope")).toBeUndefined();
  });
});

describe("text", () => {
  it("folds", () => {
    expect(fold("Zürich")).toBe("zurich");
    expect(fold("São Paulo")).toBe("sao paulo");
    expect(fold("Straße")).toBe("strasse");
    expect(fold("Rothenburg o.d. Tauber")).toBe("rothenburg o d tauber");
  });
});

describe("strip", () => {
  const start = wallToInstant("UTC", 2026, 9, 1, 19, 0);
  const rows = [
    { label: "UTC", tz: "UTC", business: { start: 9, end: 18 }, shoulder: { start: 7, end: 21 }, isAnchor: true },
    { label: "Berlin", tz: "Europe/Berlin", business: { start: 9, end: 18 }, shoulder: { start: 7, end: 21 } },
  ];
  it("renders svg and text", () => {
    const svg = renderStripSvg({ start, end: start + 7200000, anchorTz: "UTC", rows, fmt: "24h" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect((svg.match(/<rect/g) ?? []).length).toBe(2 * 16 + 1);
    // A live instant at 19:24 highlights row 19 exactly, not a slice between rows.
    const live = renderStripSvg({ start: start + 24 * 60000, anchorTz: "UTC", rows, fmt: "24h" });
    const band = /<rect x="4" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/.exec(live)!;
    expect(Number(band[1]) % 1).toBe(0);
    expect(Number(band[2])).toBe(15 + 4);
    const txt = stripText({ start, anchorTz: "UTC", rows, fmt: "24h" });
    expect(txt).toContain("Berlin");
    expect(txt).toContain("^");
  });
});

describe("zone tokens for re-anchoring", () => {
  it("prefers a short alias, then the IANA name for zone labels", () => {
    expect(zoneTokenFor({ id: "gn:1", kind: "city", label: "London", tz: "Europe/London", aliases: ["lon", "lhr"] })).toBe("lon");
    expect(zoneTokenFor({ id: "tz:Europe/Berlin", kind: "zone", label: "Central European Time (CET)", tz: "Europe/Berlin", aliases: ["cet"] })).toBe("cet");
    expect(zoneTokenFor({ id: "tz:Europe/Berlin", kind: "zone", label: "Central European Time (CET)", tz: "Europe/Berlin", aliases: [] })).toBe("Europe/Berlin");
    expect(zoneTokenFor({ id: "gn:2", kind: "city", label: "New York", tz: "America/New_York", aliases: [] })).toBe("new york");
  });
});

describe("expression rewrite", () => {
  const now = wallToInstant("Europe/London", 2026, 9, 1, 11, 43);
  const parsed = { errors: [] };
  it("puts the zone first and the time last", () => {
    const start = wallToInstant("Europe/London", 2026, 9, 1, 13, 15);
    expect(formatExpression({ start, tz: "Europe/London", now, parsed, zoneToken: "lon" })).toBe("lon 13:15");
    expect(formatExpression({ start, end: start + 3 * 3600000, tz: "Europe/London", now, parsed, zoneToken: "lon" })).toBe("lon 13:15-16:15");
    expect(formatExpression({ start, tz: "Europe/London", now, parsed })).toBe("13:15");
  });
  it("adds an ISO date only when the day is not today", () => {
    const start = wallToInstant("Europe/London", 2026, 9, 3, 9, 0);
    expect(formatExpression({ start, tz: "Europe/London", now, parsed, zoneToken: "sf" })).toBe("sf 2026-09-03 9");
  });
});
