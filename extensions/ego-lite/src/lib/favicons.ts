import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

export interface FaviconRow {
  pageUrl: string;
  imageHex: string;
  width: number;
  height: number;
  lastUpdated: string;
}

export interface FaviconIndex {
  byUrl: ReadonlyMap<string, string>;
  byOrigin: ReadonlyMap<string, string>;
}

interface Candidate {
  source: string;
  width: number;
  height: number;
  lastUpdated: bigint;
}

export const FAVICON_QUERY = `
  SELECT mappings.page_url AS pageUrl,
         hex(bitmaps.image_data) AS imageHex,
         bitmaps.width AS width,
         bitmaps.height AS height,
         CAST(bitmaps.last_updated AS TEXT) AS lastUpdated
  FROM icon_mapping AS mappings
  INNER JOIN favicon_bitmaps AS bitmaps ON bitmaps.icon_id = mappings.icon_id
  WHERE length(bitmaps.image_data) > 0;
`;

export function pngDataUriFromHex(imageHex: string): string | undefined {
  const hex = imageHex.trim();
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return undefined;

  const uppercaseHex = hex.toUpperCase();
  if (!uppercaseHex.startsWith("89504E470D0A1A0A")) return undefined;
  if (!uppercaseHex.endsWith("49454E44AE426082")) return undefined;

  return `data:image/png;base64,${Buffer.from(hex, "hex").toString("base64")}`;
}

function normalizedKeys(value: string): { url: string; origin: string } | undefined {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return { url: parsed.href, origin: parsed.origin };
  } catch {
    return undefined;
  }
}

function isBetter(candidate: Candidate, current?: Candidate): boolean {
  if (!current) return true;

  const candidateArea = candidate.width * candidate.height;
  const currentArea = current.width * current.height;
  return candidateArea > currentArea || (candidateArea === currentArea && candidate.lastUpdated > current.lastUpdated);
}

export function buildFaviconIndex(rows: readonly FaviconRow[]): FaviconIndex {
  const exactCandidates = new Map<string, Candidate>();
  const originCandidates = new Map<string, Candidate>();

  for (const row of rows) {
    const keys = normalizedKeys(row.pageUrl);
    const source = pngDataUriFromHex(row.imageHex);
    const width = Number(row.width);
    const height = Number(row.height);
    if (!keys || !source || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      continue;
    }

    const candidate: Candidate = {
      source,
      width,
      height,
      lastUpdated: /^\d+$/.test(row.lastUpdated) ? BigInt(row.lastUpdated) : 0n,
    };

    if (isBetter(candidate, exactCandidates.get(keys.url))) exactCandidates.set(keys.url, candidate);
    if (isBetter(candidate, originCandidates.get(keys.origin))) originCandidates.set(keys.origin, candidate);
  }

  return {
    byUrl: new Map([...exactCandidates].map(([key, candidate]) => [key, candidate.source])),
    byOrigin: new Map([...originCandidates].map(([key, candidate]) => [key, candidate.source])),
  };
}

export function faviconForUrl(index: FaviconIndex, value: string): string | undefined {
  const keys = normalizedKeys(value);
  return keys ? (index.byUrl.get(keys.url) ?? index.byOrigin.get(keys.origin)) : undefined;
}

export async function loadFaviconRows(databasePath: string): Promise<FaviconRow[]> {
  if (!existsSync(databasePath)) return [];

  const databaseUrl = pathToFileURL(databasePath);
  databaseUrl.searchParams.set("immutable", "1");

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databaseUrl, { readOnly: true });
    const rows = database.prepare(FAVICON_QUERY).all() as unknown as FaviconRow[];
    return rows.map((row) => ({
      pageUrl: String(row.pageUrl),
      imageHex: String(row.imageHex),
      width: Number(row.width),
      height: Number(row.height),
      lastUpdated: String(row.lastUpdated),
    }));
  } catch {
    return [];
  } finally {
    database?.close();
  }
}
