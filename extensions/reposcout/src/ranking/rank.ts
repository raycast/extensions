import type { RankableRepository } from "../types/repository";
import type { FuzzyMatch } from "../search/fuzzy";
import { DEFAULT_SIGNALS, type RankingContext, type RankingSignal } from "./signals";

/**
 * Combines modular ranking signals into a single comparable score. This module
 * knows nothing about how repositories are discovered or matched — it only
 * blends signals — which keeps ranking independent of indexing and search.
 */

/**
 * Compute the weighted ranking score for a single repository.
 *
 * @param repo    The repository plus user data.
 * @param match   The fuzzy match against the query, or `null`.
 * @param ctx     Shared ranking context (query, current time).
 * @param signals The signals to blend. Defaults to {@link DEFAULT_SIGNALS}.
 * @returns The blended score (higher is better). Not normalized to [0, 1]
 *          because only relative ordering matters.
 */
export function scoreRepository(
  repo: RankableRepository,
  match: FuzzyMatch | null,
  ctx: RankingContext,
  signals: readonly RankingSignal[] = DEFAULT_SIGNALS,
): number {
  let total = 0;
  for (const signal of signals) {
    total += signal.weight * signal.score(repo, match, ctx);
  }
  return total;
}
