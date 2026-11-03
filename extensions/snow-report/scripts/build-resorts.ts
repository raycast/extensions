/**
 * Builds src/data/resorts.json from the OpenSkiData ski areas CSV (ODbL, rebuilt daily).
 * Run with: npm run build:resorts
 *
 * CSV columns used: id, name, countries, regions, status, has_downhill,
 * min_elevation_m, max_elevation_m, websites, lat, lng.
 * Elevations come from mapped lifts and runs, so areas without them get no base/top.
 * Multi-valued columns are ";"-separated (countries, regions) or space-separated (websites).
 * lat/lng are already the centroid for polygon ski areas.
 */
import { parse } from "csv-parse/sync";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Resort } from "../src/types";

const CSV_URL = "https://tiles.openskimap.org/csv/ski_areas.csv";
const OUT_FILE = join(__dirname, "..", "src", "data", "resorts.json");
// 0 keeps every operating downhill area; raise it to drop small hills.
const MIN_VERTICAL_M = 0;

type Row = Record<string, string>;

// Published lift-served verticals in metres (approximate), used only for the spot check.
const SPOT_CHECK: { label: string; name: string; published: number }[] = [
  { label: "Whistler Blackcomb", name: "Whistler Blackcomb", published: 1609 },
  { label: "Revelstoke", name: "Revelstoke Mountain Resort", published: 1713 },
  { label: "Red Mountain", name: "Red Mountain Resort", published: 890 },
  { label: "Kicking Horse", name: "Kicking Horse Resort", published: 1260 },
  { label: "Jackson Hole", name: "Jackson Hole Mountain Resort", published: 1262 },
  { label: "Alta", name: "Alta Ski Area", published: 616 },
  { label: "Mammoth", name: "Mammoth Mountain", published: 945 },
  { label: "Chamonix (Grands Montets)", name: "Les Grands Montets", published: 2041 },
  { label: "Chamonix (Brévent/Flégère)", name: "Brévent/Flégère (Chamonix)", published: 1490 },
  { label: "Zermatt", name: "Zermatt - Breuil-Cervinia, Breuil-Cervinia Ski Paradise", published: 2279 },
  { label: "St. Anton", name: "St. Anton/St. Christoph/Stuben", published: 1507 },
  { label: "Verbier (4 Vallées)", name: "4 Vallées – Verbier/La Tzoumaz/Nendaz/Veysonnaz/Thyon", published: 2509 },
  { label: "Niseko", name: "Niseko United", published: 940 },
  { label: "Hakuba (Happo One)", name: "Hakuba Happo One", published: 1071 },
  { label: "Portillo", name: "Portillo", published: 760 },
  { label: "Thredbo", name: "Thredbo Resort", published: 672 },
];
const SPOT_CHECK_TOLERANCE = 0.15;

// Indoor slopes have no weather, so their forecasts mean nothing. OpenSkiData has no indoor flag, so
// they're matched by name: words only indoor centres use, plus the ones whose names don't say so.
// Grass ski slopes are dropped for the same reason.
const INDOOR_NAME =
  /\bindoor\b|室内|屋内|snowworld|snow ?hall|ski ?halle?\b|ski ?dome|snow ?dome|xscape|sno-?zone|alpincenter|snowplanet|\bsnova\b|chill factor|\bgrass\b/i;
const INDOOR_NAMES = new Set([
  "Big Snow American Dream",
  "InPiste",
  "Qianhai Snow World",
  "Ski Egypt",
  "Ski Snow Arena - Druskininkai",
  "Snow Valley Peer Ski & Snowboardcentre",
  "Sunac Snow Park",
  "The Snow Centre Hemel Hempstead",
  "The Snow Centre Manchester",
  "张家界冰雪世界",
  "热雪奇迹",
]);
const isIndoor = (name: string) => INDOOR_NAME.test(name) || INDOOR_NAMES.has(name);

// Names like "ニセコユナイテッド, Niseko United" list several languages; prefer the first Latin-script one.
function displayName(raw: string): string {
  const parts = raw.split(", ").map((p) => p.trim());
  const nonLatin = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;
  if (!parts.some((p) => nonLatin.test(p))) return raw.trim();
  return parts.find((p) => !nonLatin.test(p)) ?? parts[0];
}

function toResort(row: Row): Resort | undefined {
  // Unnamed areas are dropped: nobody can search for them, and they're mostly tiny unmapped points.
  if (!row.name || row.status !== "operating" || row.has_downhill !== "yes") return;
  if (isIndoor(row.name) || isIndoor(displayName(row.name))) return;
  const hasElevations = row.min_elevation_m !== "" && row.max_elevation_m !== "";
  const base = Math.round(Number(row.min_elevation_m));
  const top = Math.round(Number(row.max_elevation_m));
  if (hasElevations && top - base < MIN_VERTICAL_M) return;

  const country = row.countries.split(";").join(" / ");
  const region = row.regions.split(";").join(" / ");
  const website = row.websites.split(" ").find(Boolean);
  return {
    id: row.id,
    name: displayName(row.name),
    country,
    region,
    lat: Number(Number(row.lat).toFixed(4)),
    lon: Number(Number(row.lng).toFixed(4)),
    ...(hasElevations ? { baseElevation: base, topElevation: top } : {}),
    ...(website ? { website } : {}),
  };
}

function printSpotCheck(resorts: Resort[]) {
  const header = ["Resort", "Matched name", "Country", "Base m", "Top m", "Vert m", "Published", "Flag"];
  const rows = SPOT_CHECK.map(({ label, name, published }) => {
    const r = resorts.find((x) => x.name === name);
    if (!r) return [label, "NOT FOUND", "", "", "", "", String(published), "⚠ missing"];
    if (r.baseElevation === undefined || r.topElevation === undefined)
      return [label, r.name, r.country, "", "", "", String(published), "⚠ no elevations"];
    const vertical = r.topElevation - r.baseElevation;
    const off = Math.abs(vertical - published) / published > SPOT_CHECK_TOLERANCE;
    return [
      label,
      r.name,
      r.country,
      String(r.baseElevation),
      String(r.topElevation),
      String(vertical),
      String(published),
      off ? `⚠ ${Math.round(((vertical - published) / published) * 100)}%` : "ok",
    ];
  });
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  rows.forEach((r) => console.log(line(r)));
}

async function main() {
  console.log(`Downloading ${CSV_URL} …`);
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const rows: Row[] = parse(await res.text(), { columns: true, skip_empty_lines: true });

  const resorts = rows
    .map(toResort)
    .filter((r): r is Resort => r !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  // One resort per line keeps the file diffable.
  writeFileSync(OUT_FILE, `[\n${resorts.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`);
  const noElevations = resorts.filter((r) => r.baseElevation === undefined).length;
  console.log(`Wrote ${resorts.length} resorts (of ${rows.length} ski areas) to ${OUT_FILE}`);
  console.log(`  ${noElevations} without base/top elevations\n`);
  printSpotCheck(resorts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
