import type { Resort } from "../types";

const MAX_RESULTS = 50;

export type SearchEntry = { resort: Resort; name: string; haystack: string };

/** Lowercase and strip accents, so "flegere" matches "Flégère". */
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function buildIndex(resorts: Resort[]): SearchEntry[] {
  return resorts.map((resort) => ({
    resort,
    name: normalize(resort.name),
    haystack: normalize(`${resort.name} ${resort.country} ${resort.region}`),
  }));
}

/** Every term must match name, country or region. Name matches rank first. */
export function searchResorts(index: SearchEntry[], query: string): Resort[] {
  const q = normalize(query.trim());
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const rank = (e: SearchEntry) => (e.name.startsWith(q) ? 0 : terms.every((t) => e.name.includes(t)) ? 1 : 2);
  return index
    .filter((e) => terms.every((t) => e.haystack.includes(t)))
    .map((e) => ({ e, rank: rank(e) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_RESULTS)
    .map(({ e }) => e.resort);
}
