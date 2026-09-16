import { normalizeTitle } from "./title-text";

export type HistoryCandidate = {
  type: "movie" | "show";
  traktId: number;
  title: string;
  year?: number;
};

export type CandidatePick = {
  candidates: HistoryCandidate[];
  missedYears: number[];
  unchecked: HistoryCandidate[];
  approximated: boolean;
  yearHeldBy: HistoryCandidate[];
};

/**
 * Upper bound on how many same-title releases are probed in one lookup. Every candidate costs
 * one history request, and they run in parallel, so this only guards against pathological
 * titles; anything dropped is reported back rather than silently ignored.
 */
export const EXACT_MATCH_CHECK_CAP = 8;

export function uniqueYears(candidates: HistoryCandidate[]): number[] {
  const years = candidates.map((candidate) => candidate.year).filter((year): year is number => year !== undefined);
  return [...new Set(years)].sort((a, b) => a - b);
}

/**
 * Keep the results worth checking: every release sharing the exact title when available,
 * otherwise the two best-ranked results.
 *
 * All exact matches are equally valid readings of the query, so dropping one would let a
 * "not watched" answer be wrong about the release the user actually meant.
 */
export function pickCandidates(candidates: HistoryCandidate[], query: string, year?: number): CandidatePick {
  const normalizedQuery = normalizeTitle(query);
  const isExactTitle = (candidate: HistoryCandidate) => normalizeTitle(candidate.title) === normalizedQuery;
  const empty = (overrides: Partial<CandidatePick>): CandidatePick => ({
    candidates: [],
    missedYears: [],
    unchecked: [],
    approximated: false,
    yearHeldBy: [],
    ...overrides,
  });

  if (year !== undefined) {
    const sameYear = candidates.filter((candidate) => candidate.year === year);
    // Falling back to another year would hand back an exhaustive verdict about a different film.
    if (sameYear.length === 0) {
      return empty({ missedYears: uniqueYears(candidates) });
    }

    const exact = sameYear.filter(isExactTitle);
    if (exact.length === 0) {
      // The year exists, but only under another title ("Dune" 2026 → "Dune: Part Three").
      return empty({ missedYears: uniqueYears(candidates), yearHeldBy: sameYear });
    }

    return empty({
      candidates: exact.slice(0, EXACT_MATCH_CHECK_CAP),
      unchecked: exact.slice(EXACT_MATCH_CHECK_CAP),
    });
  }

  const exact = candidates.filter(isExactTitle);
  if (exact.length > 0) {
    return empty({
      candidates: exact.slice(0, EXACT_MATCH_CHECK_CAP),
      unchecked: exact.slice(EXACT_MATCH_CHECK_CAP),
    });
  }

  // No exact match: these are approximations. A negative cannot be called exhaustive.
  return empty({ candidates: candidates.slice(0, 2), approximated: candidates.length > 0 });
}
