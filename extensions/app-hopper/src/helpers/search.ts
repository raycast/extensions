export interface SearchField {
  value: string;
  weight: number;
}

export const SEARCH_WEIGHT = { app: 400, title: 300, url: 100, context: 20 };

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function searchTerms(query: string): string[] {
  return query.trim().split(/\s+/u).filter(Boolean);
}

/** Every term must match, but terms may match different fields of the same target. */
export function searchScore(query: string, fields: SearchField[]): number | null {
  const terms = searchTerms(query).map(normalize);
  if (terms.length === 0) return 0;
  const values = fields.map(({ value, weight }) => ({ value: normalize(value), weight }));
  let score = 0;
  for (const term of terms) {
    let best = -1;
    for (const { value, weight } of values) {
      const index = value.indexOf(term);
      if (index < 0) continue;
      const quality = value === term ? 40 : index === 0 ? 30 : /[\s/._:-]/u.test(value[index - 1]) ? 20 : 10;
      best = Math.max(best, weight + quality);
    }
    if (best < 0) return null;
    score += best;
  }
  if (values.some(({ value }) => value === normalize(query.trim()))) score += 60;
  return score;
}

export function matchesSearch(value: string, query: string): boolean {
  return searchScore(query, [{ value, weight: 0 }]) !== null;
}

/** Content results need an actual content match, not just an inherited app name. */
export function matchesAnySearchTerm(query: string, values: string[]): boolean {
  return searchTerms(query).some((term) => values.some((value) => matchesSearch(value, term)));
}

/** Consume only terms explained by the selected app/window; preserve original remaining text. */
export function remainingSearch(query: string, contexts: string[]): string {
  return searchTerms(query)
    .filter((term) => !contexts.some((context) => matchesSearch(context, term)))
    .join(" ");
}

export function rankSearch<T>(items: T[], query: string, fields: (item: T) => SearchField[]): T[] {
  if (searchTerms(query).length === 0) return items;
  return items
    .map((item, order) => ({ item, order, score: searchScore(query, fields(item)) }))
    .filter((entry): entry is { item: T; order: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ item }) => item);
}
