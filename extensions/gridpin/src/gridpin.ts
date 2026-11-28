// Everything the two commands need from the gridpin program, without Raycast: finding the program, the sheets it has
// downloaded, running a query and reading its answers. The tests (test/gridpin.test.mjs) run this file as it is.
//
// The extension never opens a network connection and never starts a shell: the program is run with execFile and the
// address is one argument, whatever quotes or `$(...)` it holds.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const INSTALL = "brew install gridpin/gridpin/gridpin";

// Raycast starts extensions with a short PATH, so the usual install places are tried by name.
export function candidates(home: string = homedir()): string[] {
  return ["/opt/homebrew/bin/gridpin", "/usr/local/bin/gridpin", join(home, ".cargo", "bin", "gridpin")];
}

/** The program: the path set in the preferences if any (and nothing else then), else the first install place. */
export function findGridpin(preferred?: string, exists: (p: string) => boolean = existsSync): string | undefined {
  const own = (preferred ?? "").trim();
  if (own) return exists(own) ? own : undefined;
  return candidates().find(exists);
}

export type Run = (bin: string, args: string[], env: NodeJS.ProcessEnv, signal?: AbortSignal) => Promise<string>;

export class GridpinError extends Error {}

// A search replaced by a newer one is stopped through its signal: the program is killed, not left to finish.
export const run: Run = (bin, args, env, signal) =>
  new Promise((resolve, reject) => {
    execFile(bin, args, { env, signal, timeout: 30000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new GridpinError(String(stderr || err.message).trim()));
      else resolve(String(stdout));
    });
  });

/** The environment of the program: the folder of sheets from the preferences, if set (the rule of `gridpin sheets`). */
export function environment(sheetsFolder?: string, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const folder = (sheetsFolder ?? "").trim();
  return folder ? { ...base, GRIDPIN_HOME: folder } : { ...base };
}

export type Sheet = { code: string; name: string; file: string; path: string; size: number; downloaded: boolean };

export function parseSheets(stdout: string): Sheet[] {
  const all = JSON.parse(stdout);
  if (!Array.isArray(all)) throw new GridpinError("gridpin sheets list --json gave no list");
  return all
    .filter((s) => s && typeof s.code === "string" && typeof s.path === "string")
    .map((s) => ({
      code: s.code,
      name: String(s.name ?? s.code),
      file: String(s.file ?? ""),
      path: s.path,
      size: Number(s.size) || 0,
      downloaded: s.downloaded === true,
    }));
}

// `sheets list --json` came with 0.7.0; an older program answers with its own usage error.
export const OLD_PROGRAM = "This gridpin is older than 0.7.0. Update it: brew upgrade gridpin";

export async function listSheets(bin: string, env: NodeJS.ProcessEnv, exec: Run = run): Promise<Sheet[]> {
  let out: string;
  try {
    out = await exec(bin, ["sheets", "list", "--json"], env);
  } catch (e) {
    const text = String((e as Error).message);
    if (/unrecognized subcommand|unexpected argument|unrecognized|Usage:/i.test(text))
      throw new GridpinError(OLD_PROGRAM);
    throw e;
  }
  return parseSheets(out);
}

/** The sheet to ask: the chosen code if it is downloaded, else the default one, else the first downloaded. */
export function pickSheet(sheets: Sheet[], chosen?: string, fallback?: string): Sheet | undefined {
  const here = sheets.filter((s) => s.downloaded);
  const by = (c?: string) => here.find((s) => s.code === (c ?? "").trim().toLowerCase());
  return by(chosen) ?? by(fallback) ?? here[0];
}

export function fetchCommand(code: string): string {
  return `gridpin sheets fetch ${code}`;
}

export type Hit = {
  lat: number;
  lon: number;
  precision: string;
  confidence: number;
  street: string;
  housenumber: string;
  commune: string;
  postcode: string;
  weak: boolean;
  distance_m?: number;
};

/** One answer per line (JSON Lines); a line that is not an answer is skipped, not guessed. */
export function parseHits(stdout: string): Hit[] {
  const hits: Hit[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    let h;
    try {
      h = JSON.parse(line);
    } catch {
      continue;
    }
    if (!h || !Number.isFinite(h.lat) || !Number.isFinite(h.lon)) continue;
    hits.push({
      lat: h.lat,
      lon: h.lon,
      precision: String(h.precision ?? ""),
      confidence: typeof h.confidence === "number" ? h.confidence : 0,
      street: String(h.street ?? ""),
      housenumber: String(h.housenumber ?? ""),
      commune: String(h.commune ?? ""),
      postcode: String(h.postcode ?? ""),
      weak: h.weak === true,
      distance_m: typeof h.distance_m === "number" ? h.distance_m : undefined,
    });
  }
  return hits;
}

export const LIMIT = 5;

export async function geocode(
  bin: string,
  sheet: string,
  address: string,
  env: NodeJS.ProcessEnv,
  exec: Run = run,
  signal?: AbortSignal,
) {
  const q = address.trim();
  if (!q) return [];
  return parseHits(await exec(bin, ["query", sheet, q, "-k", String(LIMIT)], env, signal)).slice(0, LIMIT);
}

/** "lat, lon", "lat lon" or "lat;lon" in degrees; undefined unless both are numbers in range. */
export function parsePoint(text: string): { lat: number; lon: number } | undefined {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat, lon };
}

export async function reverse(
  bin: string,
  sheet: string,
  text: string,
  env: NodeJS.ProcessEnv,
  exec: Run = run,
  signal?: AbortSignal,
) {
  const p = parsePoint(text);
  if (!p) return [];
  return parseHits(
    await exec(bin, ["reverse", sheet, String(p.lat), String(p.lon), "-k", String(LIMIT)], env, signal),
  ).slice(0, LIMIT);
}

export function address(h: Hit): string {
  const where = [h.housenumber, h.street].filter(Boolean).join(" ");
  return [where, [h.postcode, h.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function point(h: Hit): string {
  return `${h.lat}, ${h.lon}`;
}

// What the precision says to a reader; an unknown one is shown as written.
const PRECISION: Record<string, string> = {
  house: "house",
  interp: "between two houses",
  near: "nearest house",
  street: "street",
  postcode: "postcode",
  intersection: "crossing",
  unit: "flat or unit",
  poi: "place",
  place: "place",
  city: "town",
  region: "region",
};

export function subtitle(h: Hit): string {
  const parts = [PRECISION[h.precision] ?? h.precision];
  if (h.distance_m !== undefined) parts.push(`${Math.round(h.distance_m)} m away`);
  if (h.weak) parts.push("weak: check it");
  return parts.join(" · ");
}

export function appleMaps(h: Hit): string {
  return `https://maps.apple.com/?ll=${h.lat},${h.lon}&q=${encodeURIComponent(address(h) || point(h))}`;
}

export function openStreetMap(h: Hit): string {
  return `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=18/${h.lat}/${h.lon}`;
}

export function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1e6).toLocaleString("en-US")} MB`;
}
