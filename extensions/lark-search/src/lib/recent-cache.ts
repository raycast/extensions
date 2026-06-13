import { LocalStorage } from "@raycast/api";
import { LarkSearchItem, SearchScopeFilter } from "./types";

const RECENTS_KEY = "lark-search-recents";
const SEARCH_CACHE_KEY = "lark-search-query-cache";
const MAX_RECENTS = 100;
const MAX_SEARCH_CACHE_ENTRIES = 50;

type StoredRecent = LarkSearchItem & {
  source: "recent";
};

export async function getRecents(): Promise<LarkSearchItem[]> {
  const serialized = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as StoredRecent[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && item.id && item.title && item.type)
      .sort(
        (a, b) =>
          Date.parse(b.lastOpenedAt ?? "") - Date.parse(a.lastOpenedAt ?? ""),
      );
  } catch {
    return [];
  }
}

export async function recordOpen(item: LarkSearchItem) {
  const recents = await getRecents();
  const existing = recents.find((recent) => recent.id === item.id);
  const stored: StoredRecent = {
    ...item,
    source: "recent",
    lastOpenedAt: new Date().toISOString(),
    openCount: (existing?.openCount ?? item.openCount ?? 0) + 1,
    rankScore: Math.max(item.rankScore, existing?.rankScore ?? 0),
  };

  const next = [
    stored,
    ...recents.filter((recent) => recent.id !== item.id),
  ].slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export function filterRecents(
  recents: LarkSearchItem[],
  query: string,
  scopes: SearchScopeFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const scopeSet = new Set(scopes);

  return recents
    .filter((item) => scopeSet.has(item.type))
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return [item.title, item.subtitle, item.snippet]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .map((item) => ({ ...item, source: "recent" as const }));
}

type SearchCacheEntry = {
  key: string;
  query: string;
  scope: string;
  updatedAt: string;
  items: LarkSearchItem[];
};

export async function getCachedSearchResults(query: string, scope: string) {
  const cache = await getSearchCache();
  return (
    cache.find((entry) => entry.key === cacheKey(query, scope))?.items ?? []
  );
}

export async function recordSearchResults(
  query: string,
  scope: string,
  items: LarkSearchItem[],
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || items.length === 0) {
    return;
  }

  const cache = await getSearchCache();
  const entry: SearchCacheEntry = {
    key: cacheKey(normalizedQuery, scope),
    query: normalizedQuery,
    scope,
    updatedAt: new Date().toISOString(),
    items: items.map((item) => ({ ...item, source: "recent" as const })),
  };
  const next = [
    entry,
    ...cache.filter((cached) => cached.key !== entry.key),
  ].slice(0, MAX_SEARCH_CACHE_ENTRIES);
  await LocalStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(next));
}

async function getSearchCache() {
  const serialized = await LocalStorage.getItem<string>(SEARCH_CACHE_KEY);
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as SearchCacheEntry[];
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry.key && Array.isArray(entry.items))
      : [];
  } catch {
    return [];
  }
}

function cacheKey(query: string, scope: string) {
  return `${scope}:${query.trim().toLowerCase()}`;
}
