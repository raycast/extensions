import type { Location } from "./types";
import { fold } from "./text";

/** Row shapes of assets/data/*.json (see scripts/generate-data.ts). */
export type CityRow = {
  id: number;
  name: string;
  country: string;
  region: string;
  population: number;
  tz: string;
  alt: string[];
  codes: string[];
};
export type PlaceRow = { code: string; name: string; country: string; subdivision: string; tz: string };
export type ZoneInfo = {
  name: string;
  canonical: string;
  long: string;
  abbr: string[];
  /** Abbreviations the en-US locale produces for this zone (subset of `abbr`). */
  primary?: string[];
  /** Abbreviations any English Intl locale produces (subset of `abbr`; the rest are tzdb-only). */
  intl?: string[];
  /** CLDR representative zone of its metazone (Chicago for America_Central, New York for America_Eastern). */
  golden?: boolean;
  cities: string[];
  offset: number;
  country?: string;
  /** Population served (sum of bundled cities), used to rank ambiguous abbreviations such as CST or IST. */
  pop?: number;
};

export type Dataset = { cities: CityRow[]; places: PlaceRow[]; zones: ZoneInfo[] };

export function rowsToCities(json: { rows: unknown[][] }): CityRow[] {
  return json.rows.map((r) => ({
    id: r[0] as number,
    name: r[1] as string,
    country: r[2] as string,
    region: r[3] as string,
    population: r[4] as number,
    tz: r[5] as string,
    alt: r[6] as string[],
    codes: r[7] as string[],
  }));
}

export function rowsToPlaces(json: { rows: unknown[][] }): PlaceRow[] {
  return json.rows.map((r) => ({
    code: r[0] as string,
    name: r[1] as string,
    country: r[2] as string,
    subdivision: r[3] as string,
    tz: r[4] as string,
  }));
}

export function cityToLocation(c: CityRow): Location {
  return {
    id: `gn:${c.id}`,
    kind: "city",
    label: c.name,
    tz: c.tz,
    country: c.country,
    region: c.region || undefined,
    aliases: [...new Set(c.codes.map((x) => x.toLowerCase()))],
  };
}

export function placeToLocation(p: PlaceRow): Location {
  return {
    id: `lc:${p.code}`,
    kind: "city",
    label: p.name,
    tz: p.tz,
    country: p.country,
    region: p.subdivision || undefined,
    aliases: [p.code.split(":")[1].toLowerCase()],
  };
}

export function zoneToLocation(z: ZoneInfo): Location {
  return {
    id: `tz:${z.name}`,
    kind: "zone",
    label: z.name === "UTC" ? "UTC" : z.long === z.name ? z.name : z.long,
    tz: z.name,
    aliases: [...new Set([...z.abbr.map((a) => a.toLowerCase()), z.name.toLowerCase()])],
  };
}

export type Hit<T> = { row: T; score: number; location: Location };
export type SearchResult = { cities: Hit<CityRow>[]; places: Hit<PlaceRow>[]; zones: Hit<ZoneInfo>[] };

/**
 * Ranked search over the bundled dataset. Cities: code > exact name > alternate name > prefix > word prefix,
 * ties by population. UN/LOCODE-only places rank below and need ≥3 characters. Zones by abbreviation,
 * long name or IANA name; only canonical zones unless the query names a specific one.
 */
export function searchDataset(ds: Dataset, query: string, limits = { cities: 20, places: 10, zones: 8 }): SearchResult {
  const q = fold(query);
  const upper = query.trim().toUpperCase();
  const empty: SearchResult = { cities: [], places: [], zones: [] };
  if (!q) return empty;

  const cities: Hit<CityRow>[] = [];
  for (const c of ds.cities) {
    let score = 0;
    const name = fold(c.name);
    if (c.codes.includes(upper)) score = 100;
    else if (name === q) score = 90;
    else if (c.alt.some((a) => fold(a) === q)) score = 80;
    else if (name.startsWith(q)) score = 70;
    else if (c.alt.some((a) => fold(a).startsWith(q))) score = 60;
    else if (q.length >= 2 && name.split(" ").some((w) => w.startsWith(q))) score = 50;
    else if (q.length >= 3 && name.includes(q)) score = 40;
    if (!score) continue;
    cities.push({ row: c, score: score + Math.log10(c.population + 10), location: cityToLocation(c) });
  }
  cities.sort((a, b) => b.score - a.score);
  const topCities = cities.slice(0, limits.cities);
  const seen = new Set(topCities.map((h) => `${h.row.country}|${fold(h.row.name)}`));

  const places: Hit<PlaceRow>[] = [];
  if (q.length >= 3) {
    for (const p of ds.places) {
      let score = 0;
      const name = fold(p.name);
      if (upper.length === 3 && p.code.endsWith(`:${upper}`)) score = 65;
      else if (name === q) score = 55;
      else if (name.startsWith(q)) score = 35;
      else if (q.length >= 4 && name.split(" ").some((w) => w.startsWith(q))) score = 25;
      if (!score || seen.has(`${p.country}|${name}`)) continue;
      places.push({ row: p, score, location: placeToLocation(p) });
    }
    places.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
  }

  const zones: Hit<ZoneInfo>[] = [];
  for (const z of ds.zones) {
    let score = 0;
    const nameMatch = fold(z.name).includes(q) || z.name.toLowerCase().includes(query.trim().toLowerCase());
    if (z.primary?.includes(upper)) score = 92;
    else if (z.intl?.includes(upper)) score = 91;
    else if (z.abbr.includes(upper)) score = 90;
    else if (fold(z.long) === q) score = 85;
    else if (q.length >= 3 && fold(z.long).startsWith(q)) score = 70;
    else if (nameMatch) score = 50;
    else if (q.length >= 3 && z.cities.some((c) => fold(c).startsWith(q))) score = 30;
    if (!score) continue;
    if (z.canonical !== z.name && !nameMatch) continue;
    zones.push({
      row: z,
      score: score + (z.golden ? 1 : 0) + Math.log10((z.pop ?? 0) + 10) / 100,
      location: zoneToLocation(z),
    });
  }
  zones.sort((a, b) => b.score - a.score);

  return { cities: topCities, places: places.slice(0, limits.places), zones: zones.slice(0, limits.zones) };
}

/**
 * Best single dataset hit for a zone token typed in Convert Time (exact code / exact name only, to avoid surprises).
 * Relies on cities.json being sorted by population, so a shared name or code ("paris", "san jose") yields the largest city.
 */
export function lookupExact(ds: Dataset, query: string): Location | undefined {
  const q = fold(query);
  const upper = query.trim().toUpperCase();
  if (!q) return undefined;
  const city =
    ds.cities.find((c) => c.codes.includes(upper)) ??
    ds.cities.find((c) => fold(c.name) === q) ??
    ds.cities.find((c) => c.alt.some((a) => fold(a) === q));
  if (city) return cityToLocation(city);
  if (q.length >= 3) {
    const place = ds.places.find((p) => fold(p.name) === q);
    if (place) return placeToLocation(place);
  }
  return undefined;
}
