/**
 * Pure fuzzy subsequence matcher.
 *
 * Given a query and a target string it decides whether the query characters
 * appear in order within the target and, if so, produces a normalized quality
 * score in the range [0, 1] plus the matched character positions (for future
 * highlighting).
 *
 * The score is organized into deliberate tiers so that ranking is predictable
 * and testable:
 *
 *   exact match            → 1.00
 *   prefix match           → 0.95 (prefixes are always contiguous)
 *   acronym / all-boundary → 0.70 – 0.80
 *   general subsequence    → 0.30 – 0.65
 *
 * The matcher is greedy (it takes the earliest valid position for each query
 * character). Greedy alignment is optimal for the overwhelmingly common case of
 * short repository names; a full dynamic-programming alignment is noted as a
 * future improvement in docs/BACKLOG.md.
 */

/** A successful fuzzy match. */
export interface FuzzyMatch {
  /** Quality score in [0, 1]; higher is better. */
  readonly score: number;
  /** Indices in the target that were matched, in ascending order. */
  readonly positions: readonly number[];
}

const SEPARATORS = new Set(["-", "_", " ", ".", "/", "\\"]);

/**
 * Is position `index` in `target` a word boundary? Boundaries are the start of
 * the string, any character following a separator, and camelCase "humps"
 * (a lowercase/digit followed by an uppercase letter).
 */
function isBoundary(target: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const prev = target[index - 1] as string;
  const cur = target[index] as string;
  if (SEPARATORS.has(prev)) {
    return true;
  }
  const prevIsLower = prev.toLowerCase() === prev && prev.toUpperCase() !== prev;
  const prevIsDigit = prev >= "0" && prev <= "9";
  const curIsUpper = cur.toUpperCase() === cur && cur.toLowerCase() !== cur;
  return (prevIsLower || prevIsDigit) && curIsUpper;
}

/**
 * Greedily collect the positions in `target` that spell out `query` in order.
 * Returns `null` when `query` is not a subsequence of `target`.
 */
function collectPositions(queryLower: string, targetLower: string): number[] | null {
  const positions: number[] = [];
  let searchFrom = 0;
  for (const char of queryLower) {
    const found = targetLower.indexOf(char, searchFrom);
    if (found === -1) {
      return null;
    }
    positions.push(found);
    searchFrom = found + 1;
  }
  return positions;
}

/**
 * Attempt to fuzzy-match `query` against `target`.
 *
 * @returns A {@link FuzzyMatch} when the query is a subsequence of the target,
 *          otherwise `null`. An empty query returns `null`; callers that want
 *          "match everything" behavior should handle the empty query upstream.
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (query.length === 0 || target.length === 0) {
    return null;
  }

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  const positions = collectPositions(queryLower, targetLower);
  if (positions === null) {
    return null;
  }

  if (targetLower === queryLower) {
    return { score: 1, positions };
  }

  const span = (positions[positions.length - 1] as number) - (positions[0] as number) + 1;
  const density = query.length / span; // 1 when the match is contiguous.

  let boundaryHits = 0;
  for (const position of positions) {
    if (isBoundary(target, position)) {
      boundaryHits++;
    }
  }
  const boundaryRatio = boundaryHits / positions.length;

  let score: number;
  if (targetLower.startsWith(queryLower)) {
    // A prefix is always contiguous (density === 1), so this tier is a flat
    // 0.95 — strictly below the exact tier (1.0) and above acronyms.
    score = 0.85 + 0.1 * density;
  } else if (boundaryRatio === 1) {
    // Every matched char sits on a boundary → acronym-like (e.g. "rs" → RepoScout).
    score = 0.7 + 0.1 * density;
  } else {
    // General subsequence: capped below the acronym tier (max ~0.65).
    score = 0.3 + 0.35 * (0.5 * density + 0.5 * boundaryRatio);
  }

  return { score: Math.min(1, score), positions };
}
