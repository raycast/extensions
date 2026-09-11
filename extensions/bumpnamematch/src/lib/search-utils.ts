// Ported verbatim from the web app's `lib/search-utils.ts`.
// Only the synonym-map import path differs (local copy under src/data).
import synonymMap from "../data/synonym-map.json";

const synonymLookup = synonymMap as Record<string, string[]>;

/**
 * Normalize a string for accent- and case-insensitive search.
 *
 * Decomposes accented characters into a base letter + combining mark (NFD), then
 * strips the marks, so "Élodie" and "élodie" both fold to "elodie". Folding both
 * the candidate and the query makes search work in either direction: a plain
 * "elodie" finds "Élodie", and an accented "élodie" still finds it too.
 */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Build reverse index once at module load for fast lookups
// Use Object.create(null) to avoid prototype property collisions (e.g. "constructor")
const reverseIndex: Record<string, string[]> = Object.create(null);
for (const [word, syns] of Object.entries(synonymLookup)) {
  if (!Array.isArray(syns)) continue;
  for (const syn of syns) {
    if (!reverseIndex[syn]) reverseIndex[syn] = [];
    reverseIndex[syn].push(word);
  }
}

/**
 * Expand a search term into itself + its synonyms.
 * Uses both forward lookup (word → synonyms) and reverse lookup (synonym → words).
 */
export function expandSearch(term: string): string[] {
  const lower = term.toLowerCase();
  const expanded = new Set<string>([lower]);

  // Forward: direct synonyms of this word
  if (synonymLookup[lower]) {
    synonymLookup[lower].forEach((s) => expanded.add(s));
  }

  // Reverse: words that list this term as a synonym
  if (reverseIndex[lower]) {
    reverseIndex[lower].forEach((w) => expanded.add(w));
  }

  return Array.from(expanded);
}

/**
 * Check if a search term matches any nickname in a nicknames JSON string
 * (case- and accent-insensitive, exact match against each entry).
 */
export function matchesNickname(nicknamesRaw: string | null | undefined, search: string): boolean {
  if (!nicknamesRaw) return false;
  const folded = foldForSearch(search);
  try {
    const nicks: unknown = JSON.parse(nicknamesRaw);
    if (!Array.isArray(nicks)) return false;
    return nicks.some((n) => typeof n === "string" && foldForSearch(n) === folded);
  } catch {
    return false;
  }
}

/**
 * Score a name record for relevance ranking. Higher = more relevant.
 * Returns 0 if no match.
 *
 * Scoring tiers:
 *   100 - Exact name match (case- and accent-insensitive)
 *    80 - Name starts with search term
 *    60 - Name contains search term
 *    50 - Exact nickname match (e.g. "Bob" → Robert)
 *    40 - Direct meaning match
 *    20 - Synonym meaning match
 *
 * Within each tier, popularity rank is used as a tiebreaker (lower rank = higher score).
 */
export function scoreNameRecord(
  name: string,
  meaningsRaw: string | null | undefined,
  search: string,
  currentRank: number | null,
  nicknamesRaw?: string | null,
): number {
  const lower = search.toLowerCase();
  // Name matching is accent-insensitive, so "elodie" matches "Élodie" and vice versa.
  const foldedSearch = foldForSearch(search);
  const foldedName = foldForSearch(name);

  // Popularity bonus: ranked names get a small boost (max ~9 points)
  const rankBonus = currentRank ? Math.max(0, 10 - Math.log10(currentRank) * 2) : 0;

  // Exact name match
  if (foldedName === foldedSearch) return 100 + rankBonus;

  // Name starts with search term
  if (foldedName.startsWith(foldedSearch)) return 80 + rankBonus;

  // Name contains search term
  if (foldedName.includes(foldedSearch)) return 60 + rankBonus;

  // Exact nickname match
  if (matchesNickname(nicknamesRaw, lower)) return 50 + rankBonus;

  // Check meanings
  if (!meaningsRaw) return 0;

  try {
    const meanings: string[] = JSON.parse(meaningsRaw);
    const meaningsText = meanings.join(" ").toLowerCase();

    // Direct meaning match
    if (meaningsText.includes(lower)) return 40 + rankBonus;

    // Synonym meaning match
    const expanded = expandSearch(lower);
    if (expanded.some((term) => meaningsText.includes(term))) return 20 + rankBonus;
  } catch {
    if (meaningsRaw.toLowerCase().includes(lower)) return 40 + rankBonus;
  }

  return 0;
}
