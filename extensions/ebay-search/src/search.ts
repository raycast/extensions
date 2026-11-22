import { Cache } from "@raycast/api";

export type ListingMode = "active" | "sold";

const cache = new Cache();
const HISTORY_KEYS = { active: "recentSearches", sold: "recentSoldSearches" };
const MAX_RECENT_SEARCHES = 7;

export function getSearchUrl(query: string, marketplace: Preferences["marketplace"], mode: ListingMode): string {
  const host = marketplace === "CA" ? "www.ebay.ca" : "www.ebay.com";
  const url = new URL(`https://${host}/sch/i.html`);
  url.searchParams.set("_nkw", query.trim());

  if (mode === "sold") {
    url.searchParams.set("rt", "nc");
    url.searchParams.set("LH_Sold", "1");
  }

  return url.toString();
}

export function readHistory(mode: ListingMode): string[] {
  try {
    const entries: unknown = JSON.parse(cache.get(HISTORY_KEYS[mode]) ?? "[]");
    return Array.isArray(entries)
      ? entries.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function updateHistory(mode: ListingMode, update: (entries: string[]) => string[]): string[] {
  const entries = update(readHistory(mode));
  cache.set(HISTORY_KEYS[mode], JSON.stringify(entries));
  return entries;
}

export function rememberSearch(mode: ListingMode, query: string): string[] {
  const normalized = query.toLowerCase();
  return updateHistory(mode, (entries) =>
    [query, ...entries.filter((entry) => entry.toLowerCase() !== normalized)].slice(0, MAX_RECENT_SEARCHES),
  );
}
