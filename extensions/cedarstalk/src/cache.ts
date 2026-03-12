import { LocalStorage } from "@raycast/api";
import { DirectoryPerson } from "./api";

const CACHE_KEY = "directory_cache";

interface CacheStore {
  [id: string]: DirectoryPerson;
}

let memoryCache: CacheStore | null = null;

export async function loadCache(): Promise<CacheStore> {
  if (memoryCache) return memoryCache;
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  memoryCache = raw ? (JSON.parse(raw) as CacheStore) : {};
  return memoryCache;
}

export async function mergePeopleIntoCache(
  people: DirectoryPerson[],
): Promise<void> {
  const cache = await loadCache();
  for (const p of people) {
    cache[p.Id] = p;
  }
  memoryCache = cache;
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function searchCache(query: string): Promise<DirectoryPerson[]> {
  const cache = await loadCache();
  const all = Object.values(cache);
  if (!query.trim()) return all;

  const terms = query.toLowerCase().split(/\s+/);
  const scored = all.map((p) => ({ p, score: scoreMatch(p, terms) }));
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

function scoreMatch(p: DirectoryPerson, terms: string[]): number {
  const fields = [
    p.FirstName?.toLowerCase(),
    p.LastName?.toLowerCase(),
    p.Nickname?.toLowerCase(),
    p.Username?.toLowerCase(),
    p.DormName?.toLowerCase(),
    p.DepartmentDescription?.toLowerCase(),
  ].filter(Boolean) as string[];

  let score = 0;
  for (const term of terms) {
    let hit = false;
    for (const field of fields) {
      if (field.startsWith(term)) {
        score += 2;
        hit = true;
      } else if (field.includes(term)) {
        score += 1;
        hit = true;
      }
    }
    if (!hit) return 0; // all terms must match something
  }
  return score;
}

export async function getCacheSize(): Promise<number> {
  const cache = await loadCache();
  return Object.keys(cache).length;
}
