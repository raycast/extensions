import { getFileCache, setFileCache } from "./helper";

const MAX_RECENT_SEARCHES = 5;

export interface RecentSearch {
  query: string;
  timestamp: number;
  type: "movie" | "show" | "episode";
}

export async function getRecentSearches(type: "movie" | "show" | "episode"): Promise<string[]> {
  try {
    const cached = await getFileCache(`recent-searches-${type}`);
    if (!cached) return [];

    const searches: RecentSearch[] = JSON.parse(cached);
    return searches
      .filter((search) => search.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT_SEARCHES)
      .map((search) => search.query);
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string, type: "movie" | "show" | "episode"): Promise<void> {
  if (!query.trim()) return;

  try {
    const existing = await getRecentSearches(type);
    const filtered = existing.filter((q) => q.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);

    const searches: RecentSearch[] = updated.map((q) => ({
      query: q,
      timestamp: Date.now(),
      type,
    }));

    await setFileCache(`recent-searches-${type}`, JSON.stringify(searches));
  } catch {
    // Silently fail if we can't save recent searches
  }
}
