import type { RankableRepository } from "../types/repository";
import type { FuzzyMatch } from "../search/fuzzy";
import { pathDepth } from "../utils/path";
import { ONE_DAY_MS, recencyScore, saturationScore } from "./decay";

/**
 * Modular ranking signals. Each signal is a pure function returning a score in
 * [0, 1]; the combiner in `rank.ts` blends them with weights. Adding a new
 * ranking dimension (tags, workspace membership, …) means adding one signal
 * here and registering it — no changes to search or indexing. See
 * docs/ARCHITECTURE.md ("Ranking flow") and docs/DECISIONS.md (ADR-005).
 */

/** Context shared by every signal for a single ranking pass. */
export interface RankingContext {
  readonly query: string;
  readonly nowMs: number;
}

/** A named, weighted ranking signal. */
export interface RankingSignal {
  readonly name: string;
  readonly weight: number;
  /**
   * Score this repository in [0, 1].
   * @param repo  The repository plus its user data.
   * @param match The fuzzy match against the query, or `null` (empty query or
   *              matched via a non-name field).
   * @param ctx   Shared ranking context.
   */
  score(repo: RankableRepository, match: FuzzyMatch | null, ctx: RankingContext): number;
}

/** Query-relevance: encodes exact/prefix/camelCase/fuzzy via the match tiers. */
export const matchSignal: RankingSignal = {
  name: "match",
  weight: 10,
  score: (_repo, match) => match?.score ?? 0,
};

/** Pinned repositories dominate ordering among matching results. */
export const pinnedSignal: RankingSignal = {
  name: "pinned",
  weight: 100,
  score: (repo) => (repo.userData.pinned ? 1 : 0),
};

/** Favorited repositories receive a strong boost. */
export const favoriteSignal: RankingSignal = {
  name: "favorite",
  weight: 4,
  score: (repo) => (repo.userData.favorite ? 1 : 0),
};

/** Recently opened repositories rank higher; half-life of 7 days. */
export const recencySignal: RankingSignal = {
  name: "recency",
  weight: 3,
  score: (repo, _match, ctx) => recencyScore(repo.userData.lastOpenedAt, ctx.nowMs, 7 * ONE_DAY_MS),
};

/** Frequently opened repositories rank higher; half-saturation at 5 opens. */
export const frequencySignal: RankingSignal = {
  name: "frequency",
  weight: 2,
  score: (repo) => saturationScore(repo.userData.openCount, 5),
};

/** Repositories with recent Git activity rank higher; half-life of 30 days. */
export const gitActivitySignal: RankingSignal = {
  name: "gitActivity",
  weight: 1,
  score: (repo, _match, ctx) => {
    const lastCommitMs = repo.record.lastCommitAt === null ? null : repo.record.lastCommitAt * 1000;
    return recencyScore(lastCommitMs, ctx.nowMs, 30 * ONE_DAY_MS);
  },
};

/** Shorter paths (closer to a search root) get a small tie-breaking boost. */
export const shortPathSignal: RankingSignal = {
  name: "shortPath",
  weight: 0.5,
  score: (repo) => 1 / (1 + pathDepth(repo.record.path)),
};

/**
 * The default, ordered set of signals. Order is cosmetic (weights determine
 * influence) but mirrors the priority described in the project spec.
 */
export const DEFAULT_SIGNALS: readonly RankingSignal[] = [
  matchSignal,
  pinnedSignal,
  favoriteSignal,
  recencySignal,
  frequencySignal,
  gitActivitySignal,
  shortPathSignal,
];
