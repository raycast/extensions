/** Runs against the generated assets — guards the data pipeline, not just the code. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lookupExact, rowsToCities, rowsToPlaces, searchDataset, type Dataset, type ZoneInfo } from "../src/core/dataset";
import { matchZone } from "../src/core/resolve";
import { normalizeLocations } from "../src/core/store";
import { isValidZone } from "../src/core/time";
import type { Location } from "../src/core/types";

const dir = path.join(__dirname, "..", "assets", "data");
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const zones: ZoneInfo[] = read("zones.json").zones;
const ds: Dataset = { cities: rowsToCities(read("cities.json")), places: rowsToPlaces(read("places.json")), zones };
const seed: Location[] = read("seed.json");

describe("generated data", () => {
  it("has the expected shape and every zone is valid for Intl", () => {
    expect(ds.cities.length).toBeGreaterThan(60000);
    expect(ds.places.length).toBeGreaterThan(50000);
    expect(zones.length).toBeGreaterThan(400);
    const bad = new Set<string>();
    for (const c of ds.cities) if (!isValidZone(c.tz)) bad.add(c.tz);
    for (const p of ds.places) if (!isValidZone(p.tz)) bad.add(p.tz);
    for (const z of zones) if (!isValidZone(z.name)) bad.add(z.name);
    expect([...bad]).toEqual([]);
  });

  it("seed is well formed", () => {
    expect(normalizeLocations(seed)).toHaveLength(5);
    expect(seed.some((l) => l.isHome)).toBe(false);
    expect(seed.map((l) => l.label)).toEqual(["UTC", "London", "New York", "San Francisco", "Tokyo"]);
  });

  it("finds cities by code, name and alternate name", () => {
    expect(searchDataset(ds, "ZRH").cities[0].row.name).toBe("Zürich");
    expect(searchDataset(ds, "Zürich").cities[0].row.name).toBe("Zürich");
    expect(searchDataset(ds, "zuerich").cities[0].row.name).toBe("Zürich");
    expect(searchDataset(ds, "JFK").cities[0].row.name).toBe("New York City");
    expect(searchDataset(ds, "new york").cities[0].row.name).toBe("New York City");
    expect(searchDataset(ds, "LHR").cities[0].row.name).toBe("London");
    expect(searchDataset(ds, "Dinkelsb").cities.map((h) => h.row.name)).toContain("Dinkelsbühl");
    expect(searchDataset(ds, "Vancouver").cities[0].row.tz).toBe("America/Vancouver");
  });

  it("finds obscure towns via UN/LOCODE and does not duplicate cities there", () => {
    const r = searchDataset(ds, "Hallstatt");
    expect(r.cities).toHaveLength(0);
    expect(r.places[0]).toMatchObject({ row: { name: "Hallstatt", country: "AT", tz: "Europe/Vienna" } });
    const m = searchDataset(ds, "Zürich");
    expect(m.places.some((p) => p.row.country === "CH" && p.row.name === "Zürich")).toBe(false);
  });

  it("finds zones", () => {
    const cest = searchDataset(ds, "CEST").zones[0].row;
    expect(cest.abbr).toContain("CEST");
    expect(cest.offset).toBe(60);
    expect(searchDataset(ds, "Europe/Berlin").zones[0].row.name).toBe("Europe/Berlin");
    expect(searchDataset(ds, "pacific time").zones[0].row.name).toBe("America/Los_Angeles");
    expect(searchDataset(ds, "utc").zones.some((z) => z.row.name === "UTC")).toBe(true);
    expect(matchZone("cst", zones)?.tz).toBe("America/Chicago");
    expect(matchZone("ist", zones)?.tz).toBe("Asia/Kolkata");
    expect(matchZone("jst", zones)?.tz).toBe("Asia/Tokyo");
    expect(matchZone("hst", zones)?.tz).toBe("Pacific/Honolulu");
    expect(matchZone("est", zones)?.tz).toBe("America/New_York");
    expect(matchZone("pt", zones)?.tz).toBe("America/Los_Angeles");
    expect(matchZone("bst", zones)?.tz).toBe("Europe/London");
    expect(matchZone("aest", zones)?.tz).toBe("Australia/Sydney");
    expect(matchZone("Asia/Tokyo", zones)?.tz).toBe("Asia/Tokyo");
  });

  it("exact lookup for typed zone tokens", () => {
    expect(lookupExact(ds, "tokyo")?.tz).toBe("Asia/Tokyo");
    expect(lookupExact(ds, "SEA")?.label).toBe("Seattle");
    expect(lookupExact(ds, "hallstatt")?.tz).toBe("Europe/Vienna");
    expect(lookupExact(ds, "xyzzy")).toBeUndefined();
  });

  it("search is fast enough for per-keystroke use", () => {
    const t = performance.now();
    for (const q of ["s", "sa", "san", "san f", "berl", "ZRH", "hallst"]) searchDataset(ds, q);
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
