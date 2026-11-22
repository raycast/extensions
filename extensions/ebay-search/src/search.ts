import { Cache } from "@raycast/api";

export type ListingMode = "active" | "sold";

const cache = new Cache();
const HISTORY_KEY = "recentSearches";
const MAX_RECENT_SEARCHES = 7;

export function getSearchUrl(query: string, marketplace: Preferences["marketplace"], mode: ListingMode): string {
  const host = marketplace === "CA" ? "www.ebay.ca" : "www.ebay.com";
  const url = new URL(`https://${host}/sch/i.html`);
  url.searchParams.set("_nkw", query.trim());

  if (mode === "sold") {
    url.searchParams.set("LH_Sold", "1");
    url.searchParams.set("LH_Complete", "1");
  }

  return url.toString();
}

export function readHistory(): string[] {
  try {
    const entries: unknown = JSON.parse(cache.get(HISTORY_KEY) ?? "[]");
    return Array.isArray(entries)
      ? entries.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function updateHistory(update: (entries: string[]) => string[]): string[] {
  const entries = update(readHistory());
  cache.set(HISTORY_KEY, JSON.stringify(entries));
  return entries;
}

export function rememberSearch(query: string): string[] {
  const normalized = query.toLowerCase();
  return updateHistory((entries) =>
    [query, ...entries.filter((entry) => entry.toLowerCase() !== normalized)].slice(0, MAX_RECENT_SEARCHES),
  );
}
