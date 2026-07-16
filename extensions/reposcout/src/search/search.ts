import type { RepositoryRecord, RepositoryUserData } from "../types/repository";
import { getUserData } from "../cache/user-data";
import { scoreRepository } from "../ranking/rank";
import type { RankingContext, RankingSignal } from "../ranking/signals";
import { contractHome } from "../utils/path";
import { fuzzyMatch, type FuzzyMatch } from "./fuzzy";

/**
 * Query-time search over the in-memory repository index. Search NEVER touches
 * the filesystem — it operates purely on already-indexed records, which is what
 * makes it feel instantaneous. See docs/ARCHITECTURE.md ("Search flow").
 */

/** One ranked search result. */
export interface SearchResult {
  readonly record: RepositoryRecord;
  readonly userData: RepositoryUserData;
  /** Blended ranking score; higher is better. */
  readonly score: number;
  /** The fuzzy match against the repository name, for highlighting. `null`
   *  when the query was empty or matched only via the path. */
  readonly match: FuzzyMatch | null;
}

/** Options for {@link searchRepositories}. */
export interface SearchOptions {
  /** Current time in unix ms, injected for deterministic tests. */
  readonly nowMs: number;
  /** Override ranking signals (defaults to the built-in set). */
  readonly signals?: readonly RankingSignal[];
  /** Also match against the (home-contracted) path, not just the name. */
  readonly matchPath?: boolean;
}

/**
 * The effective match for a record: prefer a name match; optionally fall back to
 * a weaker path match so users can find a repo by a parent-folder fragment.
 */
function effectiveMatch(
  record: RepositoryRecord,
  query: string,
  matchPath: boolean,
): { match: FuzzyMatch | null; matched: boolean } {
  const nameMatch = fuzzyMatch(query, record.name);
  if (nameMatch) {
    return { match: nameMatch, matched: true };
  }
  if (matchPath) {
    const pathMatch = fuzzyMatch(query, contractHome(record.path));
    if (pathMatch) {
      // A path match counts as a hit, but we deliberately return a `null` match
      // so it never outranks a name match and so highlight positions (which
      // index into the name) are never mismatched against the path.
      return { match: null, matched: true };
    }
  }
  return { match: null, matched: false };
}

/**
 * Search and rank repositories for a query.
 *
 * An empty query returns every repository ranked purely by user signals
 * (favorites, recency, frequency, …), so opening the command instantly shows
 * the most relevant repositories with zero typing.
 *
 * @param query        The user's search text.
 * @param records      The indexed repositories.
 * @param userDataMap  Per-path user data for ranking.
 * @param options      See {@link SearchOptions}.
 * @returns Results sorted by descending score (stable for equal scores).
 */
export function searchRepositories(
  query: string,
  records: readonly RepositoryRecord[],
  userDataMap: ReadonlyMap<string, RepositoryUserData>,
  options: SearchOptions,
): SearchResult[] {
  const trimmed = query.trim();
  const ctx: RankingContext = { query: trimmed, nowMs: options.nowMs };
  const matchPath = options.matchPath ?? true;

  const results: SearchResult[] = [];

  for (const record of records) {
    let match: FuzzyMatch | null = null;
    if (trimmed.length > 0) {
      const evaluated = effectiveMatch(record, trimmed, matchPath);
      if (!evaluated.matched) {
        continue;
      }
      match = evaluated.match;
    }

    const rankable = { record, userData: getUserData(userDataMap, record.path) };
    const score = scoreRepository(rankable, match, ctx, options.signals);
    results.push({ record, userData: rankable.userData, score, match });
  }

  // Stable sort by score desc, then name asc for deterministic ties.
  return results
    .map((result, index) => ({ result, index }))
    .sort((a, b) => {
      if (b.result.score !== a.result.score) {
        return b.result.score - a.result.score;
      }
      const nameCompare = a.result.record.name.localeCompare(b.result.record.name);
      return nameCompare !== 0 ? nameCompare : a.index - b.index;
    })
    .map((entry) => entry.result);
}
