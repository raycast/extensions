import { describe, expect, it } from "vitest";
import { parseExpression } from "../src/core/parse";
import { matchLocations, matchZone, resolve, type ResolveContext } from "../src/core/resolve";
import type { Location } from "../src/core/types";
import type { ZoneInfo } from "../src/core/dataset";
import { wallParts, wallToInstant } from "../src/core/time";

const zones: ZoneInfo[] = [
  { name: "UTC", canonical: "UTC", long: "Coordinated Universal Time", abbr: ["UTC", "Z"], cities: [], offset: 0 },
  { name: "Europe/London", canonical: "Europe/London", long: "British Time", abbr: ["GMT", "BST"], intl: ["GMT", "BST"], cities: ["London"], offset: 0, pop: 67_000_000 },
  { name: "Europe/Berlin", canonical: "Europe/Berlin", long: "Central European Time", abbr: ["CET", "CEST"], cities: ["Berlin", "Hamburg"], offset: 60 },
  { name: "America/Los_Angeles", canonical: "America/Los_Angeles", long: "Pacific Time", abbr: ["PST", "PDT", "PT"], cities: ["Los Angeles"], offset: -480 },
  { name: "America/Denver", canonical: "America/Denver", long: "Mountain Time", abbr: ["MST", "MDT", "MT"], cities: ["Denver"], offset: -420 },
  { name: "America/New_York", canonical: "America/New_York", long: "Eastern Time", abbr: ["EST", "EDT", "ET"], cities: ["New York"], offset: -300 },
  { name: "America/Chicago", canonical: "America/Chicago", long: "Central Time", abbr: ["CST", "CDT", "CT"], primary: ["CST", "CDT"], cities: ["Chicago", "Houston"], offset: -360, pop: 50_000_000 },
  { name: "Asia/Shanghai", canonical: "Asia/Shanghai", long: "China Standard Time", abbr: ["CST"], cities: ["Shanghai"], offset: 480, pop: 940_000_000 },
  { name: "Asia/Tokyo", canonical: "Asia/Tokyo", long: "Japan Standard Time", abbr: ["JST"], cities: ["Tokyo"], offset: 540 },
];

const locations: Location[] = [
  { id: "gn:1", kind: "city", label: "London", tz: "Europe/London", country: "GB", aliases: ["lon", "lhr"], isHome: true },
  { id: "tz:UTC", kind: "zone", label: "UTC", tz: "UTC", aliases: ["utc", "z"] },
  { id: "gn:2", kind: "city", label: "San Francisco", tz: "America/Los_Angeles", country: "US", aliases: ["sfo", "sf"] },
  { id: "gn:3", kind: "city", label: "Denver", tz: "America/Denver", country: "US", aliases: ["den"] },
  { id: "gn:4", kind: "city", label: "Seattle", tz: "America/Los_Angeles", country: "US", aliases: ["sea"] },
  { id: "gn:5", kind: "city", label: "New York", tz: "America/New_York", country: "US", aliases: ["nyc", "jfk"] },
];

// Tue 1 Sep 2026 11:43 in London
const now = wallToInstant("Europe/London", 2026, 9, 1, 11, 43);
const ctx: ResolveContext = {
  now,
  locations,
  zones,
  fallback: { tz: "Europe/London", label: "London", location: locations[0] },
  dateOrder: "dmy",
};
const r = (s: string, c: Partial<ResolveContext> = {}) => resolve(parseExpression(s), { ...ctx, ...c });

describe("matchLocations", () => {
  it("exact alias / label / abbreviation score 3", () => {
    expect(matchLocations("sf", locations, zones)[0]).toMatchObject({ location: { label: "San Francisco" }, score: 3 });
    expect(matchLocations("LHR", locations, zones)[0].location.label).toBe("London");
    expect(matchLocations("bst", locations, zones)[0].location.label).toBe("London");
    expect(matchLocations("pt", locations, zones)[0].score).toBe(3);
    expect(matchLocations("z", locations, zones)[0].location.label).toBe("UTC");
    expect(matchLocations("Europe/London", locations, zones)[0].location.label).toBe("London");
  });
  it("prefixes", () => {
    expect(matchLocations("denv", locations, zones)[0].location.label).toBe("Denver");
    expect(matchLocations("s", locations, zones).map((x) => x.location.label)).toEqual(
      expect.arrayContaining(["San Francisco", "Seattle"]),
    );
    expect(matchLocations("york", locations, zones)[0].location.label).toBe("New York");
    expect(matchLocations("eastern", locations, zones)[0].location.label).toBe("New York");
  });
  it("no match", () => expect(matchLocations("tokyo", locations, zones)).toEqual([]));
});

describe("matchZone", () => {
  it("abbreviations prefer major zones", () => {
    expect(matchZone("cst", zones)?.tz).toBe("America/Chicago");
    expect(matchZone("jst", zones)?.tz).toBe("Asia/Tokyo");
    expect(matchZone("utc", zones)?.tz).toBe("UTC");
    expect(matchZone("Asia/Tokyo", zones)?.tz).toBe("Asia/Tokyo");
    expect(matchZone("japan", zones)?.tz).toBe("Asia/Tokyo");
    expect(matchZone("nowhere", zones)).toBeUndefined();
  });
});

describe("resolve", () => {
  it("empty is live now in the fallback zone", () => {
    const x = r("");
    expect(x.live).toBe(true);
    expect(x.start).toBe(now);
    expect(x.anchor.tz).toBe("Europe/London");
  });

  it("19 utc", () => {
    const x = r("19 utc");
    expect(x.live).toBe(false);
    expect(x.anchor.label).toBe("UTC");
    expect(wallParts(x.start, "UTC")).toMatchObject({ y: 2026, m: 9, d: 1, h: 19, min: 0 });
    expect(wallParts(x.start, "Europe/London").h).toBe(20);
    expect(x.end).toBeUndefined();
  });

  it("windows and durations", () => {
    const x = r("19-21 utc");
    expect(wallParts(x.end!, "UTC").h).toBe(21);
    const y = r("19 utc 2h");
    expect(y.end).toBe(y.start + 2 * 3600000);
    const z = r("22-2 utc");
    expect(wallParts(z.end!, "UTC")).toMatchObject({ d: 2, h: 2 });
  });

  it("zone only = now in that zone", () => {
    const x = r("sf");
    expect(x.live).toBe(true);
    expect(x.anchor.tz).toBe("America/Los_Angeles");
  });

  it("ambiguity is reported", () => {
    const x = r("19 s");
    expect(x.ambiguous.length).toBeGreaterThan(0);
  });

  it("dates", () => {
    expect(wallParts(r("tomorrow 9").start, "Europe/London")).toMatchObject({ d: 2, h: 9 });
    expect(wallParts(r("thu 9").start, "Europe/London")).toMatchObject({ d: 3, h: 9 });
    expect(wallParts(r("tue 9").start, "Europe/London")).toMatchObject({ d: 1, h: 9 });
    expect(wallParts(r("29 oct 17 et").start, "America/New_York")).toMatchObject({ m: 10, d: 29, h: 17 });
    expect(wallParts(r("29 oct 17 et").start, "Europe/London").h).toBe(21);
    expect(wallParts(r("3/9 9").start, "Europe/London")).toMatchObject({ m: 9, d: 3 });
    expect(wallParts(r("3/9 9", { dateOrder: "mdy" }).start, "Europe/London")).toMatchObject({ m: 3, d: 9, y: 2027 });
    expect(wallParts(r("3 jan 9").start, "Europe/London")).toMatchObject({ y: 2027, m: 1, d: 3 });
    expect(r("31/2 9").errors).toContain("invalid date");
    expect(r("2026-02-31 17 utc").errors).toContain("invalid date");
    expect(r("2026-13-45 9 utc").errors).toContain("invalid date");
    const t = r("tomorrow");
    expect(t.live).toBe(false);
    expect(wallParts(t.start, "Europe/London")).toMatchObject({ d: 2, h: 11, min: 43 });
  });

  it("a DST gap does not turn a short range into a day", () => {
    const x = r("2026-03-29 1-2");
    expect(x.end! - x.start).toBeLessThanOrEqual(3600000);
    const y = r("2026-03-29 22-2");
    expect(y.end! - y.start).toBe(4 * 3600000);
  });

  it("weekday codes and duplicate zones", () => {
    const withSat = [
      ...locations,
      { id: "gn:9", kind: "city" as const, label: "San Antonio", tz: "America/Chicago", aliases: ["sat"] },
    ];
    expect(r("sat 9", { locations: withSat }).anchor.label).toBe("San Antonio");
    expect(r("sat 9").anchor.label).toBe("London");
    expect(r("lon 19 utc").errors).toContain("one zone at a time");
    expect(r("utc+2 9 sf").errors).toContain("one zone at a time");
  });

  it("fixed offsets and unknown places", () => {
    expect(r("19 utc+2").anchor.tz).toBe("Etc/GMT-2");
    expect(r("19 tokyo").errors[0]).toMatch(/unknown place/);
    const withLookup = r("19 tokyo", {
      lookup: () => ({ tz: "Asia/Tokyo", label: "Tokyo" }),
    });
    expect(withLookup.anchor.tz).toBe("Asia/Tokyo");
  });
});
