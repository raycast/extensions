import fuzzysort from "fuzzysort";

/**
 * Fuzzy‑filter an array of objects.
 * @param query   what the user typed
 * @param list    full list (not mutated)
 * @param getter  returns the string to match on each item
 */
export function fuzzyFilter<T>(query: string, list: readonly T[], getter: (item: T) => string): T[] {
  if (!query) return list as T[];

  const results = fuzzysort.go(query, list, {
    keys: [(item) => getter(item)],
    threshold: -500, // ignore very bad matches
  });

  return results.map((r) => r.obj);
}
