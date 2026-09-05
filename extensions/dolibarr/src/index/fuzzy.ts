const CONTIGUOUS_BONUS = 8;
const BOUNDARY_BONUS = 10;
const PREFIX_BONUS = 12;
/** Awarded when the whole token appears as an unbroken run — qualitatively better than a scatter. */
const SUBSTRING_BONUS = 25;
const MAX_GAP_PENALTY = 20;
const WORD_BOUNDARY = /[ \-._@/]/;

/** Folds case and diacritics so that "muller" matches "Müller". */
export function normalize(value: string): string {
  return value
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Scores one subsequence match anchored at a fixed starting position. */
function scoreFrom(haystack: string, needle: string, start: number): number | null {
  let score = 0;
  let gapPenalty = 0;
  let contiguous = 0;
  let cursor = start;
  let previousMatch = -2;

  for (let i = 0; i < needle.length; i++) {
    const found = i === 0 ? start : haystack.indexOf(needle[i], cursor);
    if (found === -1) return null;

    gapPenalty += found - cursor;
    if (found === previousMatch + 1) {
      score += CONTIGUOUS_BONUS;
      contiguous++;
    }
    if (found === 0 || WORD_BOUNDARY.test(haystack[found - 1])) score += BOUNDARY_BONUS;
    if (i === 0 && found === 0) score += PREFIX_BONUS;

    previousMatch = found;
    cursor = found + 1;
  }

  // An unbroken run beats any scattered match, however many word boundaries the scatter happens
  // to touch. Without this, "log" ranks "LÖWENHOF Gastro" above "Frachtmann Logistik".
  if (needle.length > 1 && contiguous === needle.length - 1) score += SUBSTRING_BONUS;

  return score - Math.min(gapPenalty, MAX_GAP_PENALTY);
}

/**
 * Subsequence match scored so that contiguity and word boundaries outweigh raw position.
 * Returns null when the token cannot be formed from the field at all.
 *
 * Every occurrence of the token's first character is tried as an anchor, and the best result wins.
 * Anchoring greedily at the leftmost one would rank "LÖWENHOF Gastro GmbH" above "Frachtmann Logistik"
 * for the query "log", because the leading L is consumed before the real word is ever reached.
 */
export function scoreField(token: string, value: string | null): number | null {
  if (value === null) return null;
  const haystack = normalize(value);
  const needle = normalize(token);
  if (needle.length === 0 || haystack.length === 0) return null;

  let best: number | null = null;
  for (let start = haystack.indexOf(needle[0]); start !== -1; start = haystack.indexOf(needle[0], start + 1)) {
    const candidate = scoreFrom(haystack, needle, start);
    if (candidate !== null && (best === null || candidate > best)) best = candidate;
  }
  return best;
}

export type FieldSpec<T> = {
  get: (item: T) => string | null;
  weight: number;
};

/**
 * Every whitespace-separated token must match at least one field. A record's score is the sum of
 * its tokens' best weighted field scores.
 */
export function search<T>(items: T[], fields: FieldSpec<T>[], query: string, limit = 50): T[] {
  const tokens = normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return items.slice(0, limit);

  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    let total = 0;
    let matchedAll = true;

    for (const token of tokens) {
      let best: number | null = null;
      for (const field of fields) {
        const raw = scoreField(token, field.get(item));
        if (raw === null) continue;
        const weighted = raw * field.weight;
        if (best === null || weighted > best) best = weighted;
      }
      if (best === null) {
        matchedAll = false;
        break;
      }
      total += best;
    }

    if (matchedAll) scored.push({ item, score: total });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.item);
}
