import { Entry, Visit } from "./types";
import { emsScore } from "./history";

/** Ranking weights; time-based half-lives are in days. */
export const WEIGHTS = {
  /** Recorded opens. */
  visit: 100,
  /** Modification time. */
  mtime: 40,
  mtimeHalfLife: 14,
  /** Spotlight use count and last-used date. */
  spotlight: 25,
  spotlightHalfLife: 30,
  /** Optional folder preference. */
  folderBonus: 0,
  /** Points removed per level below the search scope. */
  depthPenalty: 12,
  /** Positional match quality within a tier. */
  match: 30,
};

const DAY_MS = 86_400_000;

function decay(ageMs: number, halfLifeDays: number): number {
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;
  return Math.pow(0.5, ageMs / (halfLifeDays * DAY_MS));
}

export type ScoreParts = {
  total: number;
  visit: number;
  mtime: number;
  spotlight: number;
  depth: number;
  match: number;
};

/** Saturating usage score from recorded opens. */
export function visitScore(visit: Visit | undefined, tick: number): number {
  return WEIGHTS.visit * Math.log2(1 + emsScore(visit, tick));
}

export type ScoreContext = {
  visit?: Visit;
  /** Wall clock, for the mtime and Spotlight terms. */
  now: number;
  /** Event clock, for the usage term. */
  tick: number;
  /** Levels below the folder being browsed. 0 for a direct child. */
  depthBelow?: number;
  /** Positional match quality, 0..1, from matchQuality(). */
  quality?: number;
};

export function scoreEntry(entry: Entry, ctx: ScoreContext): ScoreParts {
  const { visit, now, tick, depthBelow = 0, quality = 0 } = ctx;
  const visitPart = visitScore(visit, tick);

  const mtimePart =
    entry.mtimeMs > 0
      ? WEIGHTS.mtime * decay(now - entry.mtimeMs, WEIGHTS.mtimeHalfLife)
      : 0;

  let spotlightPart = 0;
  if (entry.useCount !== undefined || entry.lastUsedMs !== undefined) {
    const count = entry.useCount ?? 1;
    const age = entry.lastUsedMs !== undefined ? now - entry.lastUsedMs : 0;
    spotlightPart =
      WEIGHTS.spotlight *
      Math.log2(1 + count) *
      decay(age, WEIGHTS.spotlightHalfLife);
  }

  const bonus = entry.isDirectory ? WEIGHTS.folderBonus : 0;
  const depthPart = -WEIGHTS.depthPenalty * Math.max(0, depthBelow);
  const matchPart = WEIGHTS.match * quality;

  return {
    visit: visitPart,
    mtime: mtimePart,
    spotlight: spotlightPart,
    depth: depthPart,
    match: matchPart,
    total:
      visitPart + mtimePart + spotlightPart + bonus + depthPart + matchPart,
  };
}

/** First-pass score used to choose which Spotlight paths to stat. */
export function coarseScore(
  visit: Visit | undefined,
  now: number,
  depthBelow: number,
): number {
  return (
    visitScore(visit, now) - WEIGHTS.depthPenalty * Math.max(0, depthBelow)
  );
}
