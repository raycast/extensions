import path from "node:path";
import { Entry, SortMode, Visits } from "./types";
import { entryStoragePath } from "./entry-identity";
import { relativeDepth } from "./read-dir";
import { ScoreParts, scoreEntry } from "./score";
import { compareRankedEntries, RankedEntry } from "./result-order";
import {
  MATCH,
  ParsedQuery,
  hiddenOnly,
  matchPath,
  matchQuality,
  matchTier,
  matchesStats,
} from "./query";

export type Ranked = RankedEntry & { score: ScoreParts };

export type RankContext = {
  now: number;
  tick: number;
  visits: Visits;
  learned: ReadonlySet<string>;
  parsed: ParsedQuery;
  effectiveQuery: string;
  pathQuery: boolean;
  dir?: string;
  canonicalDir?: string;
  showHidden: boolean;
  sortMode: SortMode;
};

/** Pure ranking shared by every source: scope, matching, usage, then aliases. */
export function rankSources(
  sources: readonly Entry[],
  context: RankContext,
): Ranked[] {
  const {
    now,
    tick,
    visits,
    learned,
    parsed,
    effectiveQuery,
    pathQuery,
    dir,
    canonicalDir,
    showHidden,
    sortMode,
  } = context;
  const byPath = new Map<string, Entry>();
  for (const entry of sources) {
    // Explicit path-bar listings have already applied their visibility rules.
    if (!showHidden && !pathQuery && entry.name.startsWith(".")) continue;
    if (
      dir &&
      path.dirname(entry.path) !== dir &&
      path.dirname(entryStoragePath(entry)) !== (canonicalDir ?? dir)
    )
      continue;
    const previous = byPath.get(entry.path);
    byPath.set(
      entry.path,
      previous
        ? {
            ...previous,
            useCount: previous.useCount ?? entry.useCount,
            lastUsedMs: previous.lastUsedMs ?? entry.lastUsedMs,
          }
        : entry,
    );
  }

  const rows: Ranked[] = [];
  const identities = new Map<string, number>();
  for (const entry of byPath.values()) {
    if (
      entry.path === dir ||
      (hiddenOnly(parsed) && !entry.name.startsWith("."))
    )
      continue;
    const storagePath = entryStoragePath(entry);
    const tier = learned.has(storagePath)
      ? MATCH.LEARNED
      : pathQuery
        ? matchTier(effectiveQuery, entry.name)
        : matchPath(parsed, entry.path, entry.isDirectory);
    if (tier === undefined || !matchesStats(parsed, entry)) continue;
    const row: Ranked = {
      entry,
      tier,
      score: scoreEntry(entry, {
        visit: visits[storagePath],
        now,
        tick,
        depthBelow: dir ? relativeDepth(dir, entry.path) : 0,
        quality: matchQuality(parsed.longest, entry.name),
      }),
    };

    // Same identity and name: keep the higher-scoring route in its slot.
    // Differently named shortcuts remain separately searchable.
    const key =
      entry.dev === undefined || entry.ino === undefined
        ? undefined
        : `${entry.dev}:${entry.ino}:${entry.name.toLowerCase()}`;
    const index = key === undefined ? undefined : identities.get(key);
    if (index === undefined) {
      if (key !== undefined) identities.set(key, rows.length);
      rows.push(row);
    } else if (row.score.total > rows[index].score.total) {
      rows[index] = row;
    }
  }
  return rows.sort(compareRankedEntries(sortMode));
}
