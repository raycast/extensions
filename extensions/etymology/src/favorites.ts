// Pinned words in LocalStorage, listed above search results when the query is
// empty. Stored as one JSON array rather than a key per word: the list is short,
// and reading it as a unit keeps the order the user pinned things in.

import { LocalStorage } from "@raycast/api";

const KEY = "favorites";

export interface Favorite {
  term: string;
  lang: string;
  langName: string;
}

export async function list(): Promise<Favorite[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function add(favorite: Favorite): Promise<Favorite[]> {
  const current = await list();
  if (current.some((f) => same(f, favorite))) return current;

  const next = [favorite, ...current];
  await LocalStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function remove(favorite: Favorite): Promise<Favorite[]> {
  const next = (await list()).filter((f) => !same(f, favorite));
  await LocalStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function has(favorite: Favorite): Promise<boolean> {
  return (await list()).some((f) => same(f, favorite));
}

/** Case-sensitive, matching Wiktionary titles and the cache key: `Polish` is not `polish`. */
function same(a: Favorite, b: Favorite): boolean {
  return a.lang === b.lang && a.term === b.term;
}
