/**
 * Builds assets/data/{cities,places,zones}.json from open datasets.
 *
 *   npm run generate-data            # uses scripts/.cache, downloads what is missing
 *   npm run generate-data -- --fresh # re-download everything
 *
 * Sources (see NOTICE.md for the notices each one requires)
 *   GeoNames cities5000, alternateNamesV2, admin1CodesASCII   CC BY 4.0        https://download.geonames.org/export/dump/
 *   UN/LOCODE (UNECE) via the @geoapify/un-locode package     UN terms of use  https://unece.org/trade/cefact/unlocode-code-list-country-and-territory
 *   OurAirports airports.csv                                   public domain    https://ourairports.com/data/
 *   IANA tz via @vvo/tzdb                                      MIT
 *   CLDR metaZones via cldr-core                               Unicode-3.0
 *   tz-lookup (CC0) whose boundaries come from timezone-boundary-builder (ODbL)
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getTimeZones } from "@vvo/tzdb";
import tzlookup from "tz-lookup";
import { fold, isLatin } from "../src/core/text";

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(__dirname, ".cache");
const OUT = path.join(ROOT, "assets", "data");
const FRESH = process.argv.includes("--fresh");
const UA = "yatt data generator (https://github.com/alexbartok/yatt-for-raycast)";

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

async function download(url: string, file: string): Promise<string> {
  const target = path.join(CACHE, file);
  if (existsSync(target) && !FRESH) return target;
  console.log(`↓ ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(`${target}.part`));
  renameSync(`${target}.part`, target);
  return target;
}

async function downloadZipMember(url: string, zip: string, member: string): Promise<string> {
  const target = path.join(CACHE, member);
  if (existsSync(target) && !FRESH) return target;
  const zipPath = await download(url, zip);
  execFileSync("unzip", ["-o", "-q", zipPath, member, "-d", CACHE]);
  return target;
}

/** Minimal RFC 4180 parser (quotes, doubled quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------- GeoNames

type City = {
  id: number;
  name: string;
  alt: string[];
  country: string;
  admin1: string;
  region: string;
  pop: number;
  tz: string;
  lat: number;
  lon: number;
  codes: string[]; // UN/LOCODE + IATA, upper case
  locodes: Set<string>; // from GeoNames "unlc" links, e.g. "ZRH"
};

async function loadCities(): Promise<City[]> {
  const admin1File = await download("https://download.geonames.org/export/dump/admin1CodesASCII.txt", "admin1CodesASCII.txt");
  const admin1 = new Map<string, string>();
  for (const line of readFileSync(admin1File, "utf8").split("\n")) {
    const [code, name] = line.split("\t");
    if (code && name) admin1.set(code, name);
  }

  const file = await downloadZipMember("https://download.geonames.org/export/dump/cities5000.zip", "cities5000.zip", "cities5000.txt");
  const cities: City[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const name = f[1];
    const ascii = f[2];
    const alt: string[] = [];
    if (fold(ascii) !== fold(name)) alt.push(ascii);
    cities.push({
      id: Number(f[0]),
      name,
      alt,
      country: f[8],
      admin1: f[10],
      region: admin1.get(`${f[8]}.${f[10]}`) ?? "",
      pop: Number(f[14]) || 0,
      tz: f[17],
      lat: Number(f[4]),
      lon: Number(f[5]),
      codes: [],
      locodes: new Set(),
    });
  }
  cities.sort((a, b) => b.pop - a.pop);
  await attachAlternateNames(cities);
  return cities;
}

const ALT_LANGS = new Set(["en", "de", "fr", "es", "it", "pt", "nl"]);

/**
 * GeoNames alternateNamesV2: tagged names. Keeps Latin-script names in a few major languages (max 6),
 * plus "abbr"/"iata" codes and the "unlc" link, which joins a city to its UN/LOCODE without guessing.
 */
async function attachAlternateNames(cities: City[]): Promise<void> {
  const file = await downloadZipMember(
    "https://download.geonames.org/export/dump/alternateNamesV2.zip",
    "alternateNamesV2.zip",
    "alternateNamesV2.txt",
  );
  const byId = new Map<number, City>();
  for (const c of cities) byId.set(c.id, c);
  type Cand = { name: string; score: number };
  const cands = new Map<number, Cand[]>();
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    const f = line.split("\t");
    const id = Number(f[1]);
    const city = byId.get(id);
    if (!city) continue;
    const lang = f[2];
    const value = f[3];
    if (lang === "unlc") {
      // "DEMUC": keep every link whose country matches the city (GeoNames has a few stray "XXXXX" entries).
      if (value.length === 5 && value.slice(0, 2) === city.country) city.locodes.add(value.slice(2));
    } else if (lang === "iata" || lang === "abbr") {
      if (/^[A-Z]{3}$/.test(value) && !city.codes.includes(value)) city.codes.push(value);
    } else if (ALT_LANGS.has(lang)) {
      if (!isLatin(value) || value.length > 40) continue;
      const score = (f[4] === "1" ? 2 : 0) + (f[5] === "1" ? 1 : 0) + (lang === "en" ? 1 : 0) + (f[7] === "1" ? -1 : 0);
      const arr = cands.get(id) ?? [];
      arr.push({ name: value, score });
      cands.set(id, arr);
    }
  }
  for (const [id, arr] of cands) {
    const city = byId.get(id)!;
    const seen = new Set<string>([fold(city.name), ...city.alt.map(fold)]);
    arr.sort((a, b) => b.score - a.score);
    for (const a of arr) {
      const k = fold(a.name);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      city.alt.push(a.name);
      if (city.alt.length >= 6) break;
    }
  }
}

/** country → folded name → cities (by population desc). */
function indexCities(cities: City[]): Map<string, City[]> {
  const idx = new Map<string, City[]>();
  const add = (k: string, c: City) => {
    const arr = idx.get(k);
    if (arr) {
      if (!arr.includes(c)) arr.push(c);
    } else idx.set(k, [c]);
  };
  for (const c of cities) {
    add(`${c.country}|${fold(c.name)}`, c);
    for (const a of c.alt) add(`${c.country}|${fold(a)}`, c);
  }
  return idx;
}

function matchCity(
  idx: Map<string, City[]>,
  country: string,
  name: string,
  lat: number | undefined,
  lon: number | undefined,
  maxKm: number,
): City | undefined {
  const cands = idx.get(`${country}|${fold(name)}`);
  if (!cands) return undefined;
  if (lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon)) {
    let best: City | undefined;
    let bestKm = maxKm;
    for (const c of cands) {
      const km = haversineKm(lat, lon, c.lat, c.lon);
      if (km < bestKm) {
        bestKm = km;
        best = c;
      }
    }
    return best;
  }
  return cands[0];
}

// ---------------------------------------------------------------- UN/LOCODE

type Place = {
  code: string; // "US:OLL"
  name: string;
  country: string;
  subdivision: string;
  tz: string;
};

function loadLocode(cities: City[], idx: Map<string, City[]>): Place[] {
  const dir = path.join(ROOT, "node_modules", "@geoapify", "un-locode", "dist", "data");
  const linked = new Map<string, City>(); // "CH:ZRH" -> city
  for (const c of cities) for (const code of c.locodes) if (!linked.has(`${c.country}:${code}`)) linked.set(`${c.country}:${code}`, c);
  // Zones that belong to each country, to reject source rows with impossible coordinates.
  const zonesByCountry = new Map<string, Set<string>>();
  for (const z of getTimeZones({ includeUtc: false })) {
    const set = zonesByCountry.get(z.countryCode) ?? new Set<string>();
    for (const g of z.group) set.add(g);
    zonesByCountry.set(z.countryCode, set);
  }
  const places: Place[] = [];
  const seenCodes = new Set<string>();
  let skippedFunction = 0;
  let skippedZone = 0;
  let skippedName = 0;
  let duplicates = 0;
  let matched = 0;
  let unmatchedNoCoord = 0;
  let removed = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
    const rows = parseCsv(readFileSync(path.join(dir, file), "utf8"));
    const header = rows.shift()!;
    const col = (n: string) => header.indexOf(n);
    const iCountry = col("country");
    const iCode = col("location");
    const iName = col("name");
    const iNameWo = col("nameWoDiacritics");
    const iSub = col("subdivision");
    const iStatus = col("status");
    const iLat = col("lat");
    const iLon = col("lon");
    const iFunction = col("function");
    for (const r of rows) {
      if (r[iStatus] === "XX") {
        removed++;
        continue;
      }
      const country = r[iCountry];
      const code = r[iCode];
      if (!country || !code || code.length !== 3) continue;
      // Upstream CSVs lost diacritics to U+FFFD ("M�nchen"); the ASCII column is intact.
      const rawName = r[iName] && !r[iName].includes("\uFFFD") ? r[iName] : r[iNameWo];
      const name = rawName.replace(/\s*\(.*?\)\s*$/, "").trim();
      const asciiName = (r[iNameWo] || "").replace(/\s*\(.*?\)\s*$/, "").trim();
      if (!name) continue;
      const lat = r[iLat] === "" ? undefined : Number(r[iLat]);
      const lon = r[iLon] === "" ? undefined : Number(r[iLon]);
      const hasCoord = lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon);
      const key = `${country}:${code}`;
      // 1. GeoNames' own link, 2. name + distance (diacritics or ASCII spelling) — before any function filter,
      // so a city keeps its code even when UN/LOCODE lists it only as a port or an airport.
      const city =
        linked.get(key) ??
        matchCity(idx, country, name, lat, lon, 40) ??
        (asciiName && asciiName !== name ? matchCity(idx, country, asciiName, lat, lon, 40) : undefined);
      if (city) {
        if (!city.codes.includes(code)) city.codes.push(code);
        matched++;
        continue;
      }
      const fn = r[iFunction] ?? "";
      // Standalone places must be somewhere people live: road/rail/postal/multimodal/unknown, not a pure port,
      // airport or fixed installation; and not named as a terminal.
      const isTown = fn === "" || /[2356]/.test(fn) || fn.startsWith("0");
      if (!isTown) {
        skippedFunction++;
        continue;
      }
      if (/\b(apt|airport|aeropuerto|terminal|platform|pier|port of)\b/i.test(name)) {
        skippedName++;
        continue;
      }
      if (!hasCoord) {
        unmatchedNoCoord++;
        continue;
      }
      let tz: string;
      try {
        tz = tzlookup(lat!, lon!);
      } catch {
        continue;
      }
      const allowed = zonesByCountry.get(country);
      if (allowed && !allowed.has(tz)) {
        skippedZone++;
        continue;
      }
      if (seenCodes.has(key)) {
        duplicates++;
        continue;
      }
      seenCodes.add(key);
      places.push({ code: `${country}:${code}`, name, country, subdivision: r[iSub] ?? "", tz });
    }
  }
  console.log(
    `UN/LOCODE: ${matched} matched to cities, ${places.length} standalone places, ${unmatchedNoCoord} skipped (no coordinates), ${removed} removed entries, ${skippedFunction} non-town entries skipped, ${skippedName} terminals skipped, ${skippedZone} rows with coordinates outside their country dropped, ${duplicates} duplicate codes dropped`,
  );
  places.sort((a, b) => a.name.localeCompare(b.name));
  return places;
}

// ---------------------------------------------------------------- OurAirports

async function loadAirports(idx: Map<string, City[]>): Promise<void> {
  const file = await download("https://ourairports.com/data/airports.csv", "airports.csv");
  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = rows.shift()!;
  const col = (n: string) => header.indexOf(n);
  const iType = col("type");
  const iLat = col("latitude_deg");
  const iLon = col("longitude_deg");
  const iCountry = col("iso_country");
  const iCity = col("municipality");
  const iIata = col("iata_code");
  const iSched = col("scheduled_service");
  let matched = 0;
  let unmatched = 0;
  const misses: string[] = [];
  for (const r of rows) {
    if (!["large_airport", "medium_airport"].includes(r[iType])) continue;
    const iata = r[iIata];
    if (!iata || iata.length !== 3 || !r[iCity]) continue;
    if (r[iSched] !== "yes" && r[iType] !== "large_airport") continue;
    const municipality = r[iCity].replace(/\s*\(.*?\)\s*$/, "").trim();
    const lat = r[iLat] === "" ? undefined : Number(r[iLat]);
    const lon = r[iLon] === "" ? undefined : Number(r[iLon]);
    const city = matchCity(idx, r[iCountry], municipality, lat, lon, 120);
    if (city) {
      if (!city.codes.includes(iata)) city.codes.push(iata);
      matched++;
    } else {
      unmatched++;
      if (misses.length < 15) misses.push(`${iata} ${r[iCity]} (${r[iCountry]})`);
    }
  }
  console.log(`Airports: ${matched} IATA codes attached, ${unmatched} unmatched, e.g. ${misses.join(", ")}`);
}

// ---------------------------------------------------------------- Zones

type Zone = {
  name: string; // IANA
  canonical: string; // representative zone of the tzdb group
  long: string; // "Central European Time"
  abbr: string[]; // ["CET","CEST"]
  /** Abbreviations the en-US locale itself produces — what an English speaker means by "CST" or "AST". */
  primary: string[];
  /** Abbreviations any English Intl locale produces (en-US/GB/AU/IN); the rest of `abbr` come from tzdb only. */
  intl: string[];
  /** CLDR "golden" zone of its metazone (America_Central → America/Chicago): the representative for ambiguous abbreviations. */
  golden: boolean;
  cities: string[];
  offset: number; // raw offset, minutes
  country?: string;
  /** Sum of GeoNames city populations in the zone's tzdb group — importance for ranking ambiguous abbreviations. */
  pop: number;
};

function shortNames(tz: string, locales = ["en-US", "en-GB", "en-AU", "en-IN"]): string[] {
  const out = new Set<string>();
  for (const locale of locales) {
    for (const style of ["short", "shortGeneric"] as const) {
      for (const month of [0, 6]) {
        try {
          const parts = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: style }).formatToParts(
            new Date(Date.UTC(2026, month, 15, 12)),
          );
          const n = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
          if (/^[A-Z]{2,5}$/.test(n)) out.add(n);
        } catch {
          /* unsupported */
        }
      }
    }
  }
  return [...out];
}

function loadZones(cities: City[]): Zone[] {
  const tzdb = getTimeZones({ includeUtc: true });
  const byName = new Map<string, (typeof tzdb)[number]>();
  for (const z of tzdb) for (const g of z.group) byName.set(g, z);
  // CLDR metazones: each zone's *current* metazone (last entry without "_to") and the metazone's golden zone
  // (territory 001). A zone is golden only for its current metazone — Santo Domingo's historic "Dominican" metazone
  // must not make it the representative of AST. CLDR names may be legacy ("Asia/Calcutta"): compare via tzdb groups.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const meta = require("cldr-core/supplemental/metaZones.json").supplemental.metaZones as {
    metazoneInfo: { timezone: Record<string, unknown> };
    metazones: { mapZone: { _other: string; _type: string; _territory: string } }[];
  };
  const canon = (n: string) => byName.get(n)?.name ?? n;
  const goldenOfMetazone = new Map<string, string>();
  for (const m of meta.metazones) if (m.mapZone._territory === "001") goldenOfMetazone.set(m.mapZone._other, canon(m.mapZone._type));
  const currentMetazone = new Map<string, string>(); // canonical zone -> metazone
  const walk = (node: Record<string, unknown>, path: string[]) => {
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v)) {
        const current = (v as { usesMetazone: { _mzone: string; _to?: string } }[]).find((u) => !u.usesMetazone._to);
        if (current) currentMetazone.set(canon([...path, k].join("/")), current.usesMetazone._mzone);
      } else if (v && typeof v === "object") walk(v as Record<string, unknown>, [...path, k]);
    }
  };
  walk(meta.metazoneInfo.timezone, []);
  const isGolden = (zone: string) => {
    const mz = currentMetazone.get(zone);
    return mz !== undefined && goldenOfMetazone.get(mz) === zone;
  };
  const names = new Set<string>([...Intl.supportedValuesOf("timeZone"), ...tzdb.map((z) => z.name), "UTC"]);
  const popByCanonical = new Map<string, number>();
  for (const c of cities) {
    const key = byName.get(c.tz)?.name ?? c.tz;
    popByCanonical.set(key, (popByCanonical.get(key) ?? 0) + c.pop);
  }
  const zones: Zone[] = [];
  for (const name of names) {
    const g = byName.get(name);
    let offset = g?.rawOffsetInMinutes;
    if (offset === undefined) {
      try {
        const d = new Date(Date.UTC(2026, 0, 15, 12));
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: name, timeZoneName: "longOffset" }).formatToParts(d);
        const v = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
        const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(v);
        offset = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
      } catch {
        continue;
      }
    }
    const abbr = shortNames(name);
    const intl = [...abbr];
    const primary = shortNames(name, ["en-US"]);
    if (name === "UTC" || name === "Etc/UTC") {
      abbr.push("UTC", "Z");
      intl.push("UTC", "Z");
      primary.push("UTC", "Z");
    }
    if (g?.abbreviation && /^[A-Z]{2,5}$/.test(g.abbreviation) && !abbr.includes(g.abbreviation)) abbr.push(g.abbreviation);
    const isUtc = name === "UTC" || name === "Etc/UTC";
    const long = isUtc || !g?.alternativeName || g.alternativeName === name ? undefined : g.alternativeName;
    zones.push({
      name,
      canonical: g?.name ?? name,
      long: isUtc ? "Coordinated Universal Time" : (long ?? name.replace(/_/g, " ").replace(/^.*\//, "")),
      abbr: [...new Set(abbr)],
      primary: [...new Set(primary)],
      intl: [...new Set(intl)],
      golden: (g?.name ?? name) === name && isGolden(name),
      cities: (g?.mainCities ?? []).filter(Boolean),
      offset,
      country: g?.countryCode,
      pop: popByCanonical.get(g?.name ?? name) ?? 0,
    });
  }
  zones.sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name));
  return zones;
}

// ---------------------------------------------------------------- main

async function main() {
  const cities = await loadCities();
  const idx = indexCities(cities);
  const places = loadLocode(cities, idx);
  await loadAirports(idx);
  const zones = loadZones(cities);

  const generated = new Date().toISOString().slice(0, 10);
  const write = (file: string, data: unknown) => {
    const text = JSON.stringify(data);
    writeFileSync(path.join(OUT, file), text);
    console.log(`→ ${file}: ${(text.length / 1e6).toFixed(2)} MB`);
  };
  write("cities.json", {
    generated,
    fields: ["id", "name", "country", "region", "population", "tz", "alt", "codes"],
    rows: cities.map((c) => [c.id, c.name, c.country, c.region, c.pop, c.tz, c.alt, c.codes]),
  });
  write("places.json", {
    generated,
    fields: ["code", "name", "country", "subdivision", "tz"],
    rows: places.map((p) => [p.code, p.name, p.country, p.subdivision, p.tz]),
  });
  write("zones.json", { generated, zones });

  // First-run seed: looked up by name so ids/zones/codes are never typed by hand.
  const SEED: { name?: string; country?: string; tz?: string; label?: string; home?: boolean }[] = [
    { tz: "UTC" },
    { name: "London", country: "GB" },
    { name: "New York City", country: "US", label: "New York" },
    { name: "San Francisco", country: "US" },
    { name: "Tokyo", country: "JP" },
  ];
  const seed = SEED.map((s) => {
    if (s.tz) {
      const z = zones.find((z) => z.name === s.tz)!;
      return { id: `tz:${z.name}`, kind: "zone", label: s.label ?? z.name, tz: z.name, aliases: z.abbr.map((a) => a.toLowerCase()) };
    }
    const c = cities.find((c) => c.name === s.name && c.country === s.country);
    if (!c) throw new Error(`seed city not found: ${s.name}`);
    return {
      id: `gn:${c.id}`,
      kind: "city",
      label: s.label ?? c.name,
      tz: c.tz,
      country: c.country,
      region: c.region || undefined,
      aliases: c.codes.map((x) => x.toLowerCase()),
      ...(s.home ? { isHome: true } : {}),
    };
  });
  write("seed.json", seed);

  for (const n of ["London", "New York City", "San Francisco", "Tokyo", "Zürich", "Rothenburg ob der Tauber", "Seattle"]) {
    const c = cities.find((c) => c.name === n);
    console.log(`  ${n}: ${c ? `${c.tz} codes=${c.codes.join(",")} alt=${c.alt.slice(0, 4).join(",")}` : "MISSING"}`);
  }
  console.log(`  Hallstatt: ${places.find((p) => p.name === "Hallstatt")?.code ?? "MISSING"}`);
  console.log(`  zones: ${zones.length}, e.g. ${JSON.stringify(zones.find((z) => z.name === "Europe/Berlin"))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
