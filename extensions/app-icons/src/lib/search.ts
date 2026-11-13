import { artworkUrl, storeViewUrl } from "./artwork";
import { normalizeCountry } from "./countries";

const SEARCH_LIMIT = "30";
const MAX_TERM_LENGTH = 200;

export interface AppIcon {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl: string;
  trackViewUrl: string;
  primaryGenreName?: string;
}

interface ItunesRow {
  trackId?: unknown;
  trackName?: unknown;
  artistName?: unknown;
  artworkUrl512?: unknown;
  artworkUrl100?: unknown;
  trackViewUrl?: unknown;
  primaryGenreName?: unknown;
  kind?: unknown;
}

export async function searchAppIcons(term: string, country: string, signal?: AbortSignal): Promise<AppIcon[]> {
  const search = term.trim().slice(0, MAX_TERM_LENGTH);
  if (!search) return [];

  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("media", "software");
  url.searchParams.set("limit", SEARCH_LIMIT);
  url.searchParams.set("term", search);
  url.searchParams.set("country", normalizeCountry(country));

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`App Store search failed (${response.status})`);
  }

  return normalizeResults(await response.json());
}

/** One request for curated suggestion artwork; IDs must be known App Store track IDs. */
export async function lookupAppIcons(ids: number[], country: string, signal?: AbortSignal): Promise<AppIcon[]> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (unique.length === 0) return [];

  const url = new URL("https://itunes.apple.com/lookup");
  url.searchParams.set("id", unique.join(","));
  url.searchParams.set("country", normalizeCountry(country));

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`App Store lookup failed (${response.status})`);
  }

  return normalizeResults(await response.json());
}

function normalizeResults(payload: unknown): AppIcon[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  const apps: AppIcon[] = [];
  for (const item of results) {
    const app = normalizeRow(item);
    if (app) apps.push(app);
  }
  return apps;
}

function normalizeRow(item: unknown): AppIcon | undefined {
  if (!item || typeof item !== "object") return undefined;
  const row = item as ItunesRow;
  if (row.kind !== "software" && row.kind !== "mac-software") return undefined;
  if (typeof row.trackId !== "number" || typeof row.trackName !== "string") return undefined;

  const artwork = artworkUrl(row.artworkUrl512) ?? artworkUrl(row.artworkUrl100);
  if (!artwork) return undefined;

  const viewUrl = storeViewUrl(row.trackViewUrl);
  if (!viewUrl) return undefined;

  return {
    trackId: row.trackId,
    trackName: row.trackName,
    artistName: typeof row.artistName === "string" ? row.artistName : "",
    artworkUrl: artwork,
    trackViewUrl: viewUrl,
    primaryGenreName: typeof row.primaryGenreName === "string" ? row.primaryGenreName : undefined,
  };
}
