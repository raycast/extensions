// Pure updates for what the command remembers per library: favorites, use counts, saved AI keywords.

import { normalizePhrase, SavedKeywords } from "./search";

export function toggleFavorite(favorites: string[], name: string): string[] {
  return favorites.includes(name) ? favorites.filter((favorite) => favorite !== name) : [...favorites, name];
}

export interface Use {
  count: number;
  last: number;
}

export type Uses = Record<string, Use>;

const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

export function recordUse(uses: Uses, name: string, now: number): Uses {
  return { ...uses, [name]: { count: (uses[name]?.count ?? 0) + 1, last: now } };
}

/** Frecency: each use counts, and a use's weight halves every two weeks. */
export function frecency(use: Use, now: number): number {
  return use.count * Math.pow(0.5, Math.max(0, now - use.last) / HALF_LIFE_MS);
}

export function topUsed(uses: Uses, limit: number, now: number, exclude: Set<string> = new Set()): string[] {
  return Object.entries(uses)
    .filter(([name]) => !exclude.has(name))
    .sort(([a, useA], [b, useB]) => frecency(useB, now) - frecency(useA, now) || a.localeCompare(b))
    .slice(0, limit)
    .map(([name]) => name);
}

export function addSavedKeyword(saved: SavedKeywords, name: string, query: string): SavedKeywords {
  const phrase = normalizePhrase(query);
  const current = saved[name] ?? [];
  if (!phrase || current.includes(phrase)) return saved;
  return { ...saved, [name]: [...current, phrase] };
}

/** Replaces an icon's saved keywords with `text`, one phrase per line or comma; none left forgets them. */
export function setSavedKeywords(saved: SavedKeywords, name: string, text: string): SavedKeywords {
  const phrases = [
    ...new Set(
      text
        .split(/[\n,]+/)
        .map(normalizePhrase)
        .filter(Boolean),
    ),
  ];
  if (!phrases.length) return forgetSavedKeywords(saved, name);
  return { ...saved, [name]: phrases };
}

export function forgetSavedKeywords(saved: SavedKeywords, name: string): SavedKeywords {
  const next = { ...saved };
  delete next[name];
  return next;
}

/** `count` items picked at random without repeats. */
export function sample<T>(items: T[], count: number, random: () => number = Math.random): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return picked;
}
