/** Search stages displayed in the section status. */
export type Stage =
  "done" | "running" | "waiting" | "skipped" | "partial" | "failed";

export type Progress = {
  /** Visit history and pins needed for initial ranking. */
  memory: Stage;
  /** Reading the folder in scope, and its usage metadata. */
  folder: Stage;
  /** The indexed name search. */
  index: Stage;
  /** Usage metadata for the current folder's entries. */
  ranking: Stage;
  /** Characters still needed before the index is worth querying. */
  needed?: number;
};

/** Returns folder entries that still need usage metadata. */
export function missingUsagePaths(
  paths: Iterable<string>,
  cached: ReadonlyMap<string, unknown>,
): string[] {
  return [...paths].filter((path) => !cached.has(path));
}

const ORDER: (keyof Omit<Progress, "needed">)[] = [
  "memory",
  "folder",
  "index",
  "ranking",
];

export function isSettled(p: Progress): boolean {
  return ORDER.every(
    (k) =>
      p[k] === "done" ||
      p[k] === "skipped" ||
      p[k] === "partial" ||
      p[k] === "failed",
  );
}

/**
 * Whether any stage can still change the rows.
 *
 * Narrower than the negation of `isSettled`, and deliberately so: a `waiting`
 * index is one that will not be queried for this query at all, so a short
 * query's memory results are already final and holding them back would hold
 * them forever.
 */
export function rowsCanChange(p: Progress): boolean {
  return ORDER.some((key) => p[key] === "running");
}

function hasFailure(p: Progress): boolean {
  return ORDER.some((key) => p[key] === "failed");
}

function hasPartial(p: Progress): boolean {
  return ORDER.some((key) => p[key] === "partial");
}

/** Green is complete, yellow pending, orange partial, and red failed. */
export function statusLight(p: Progress): string {
  if (hasFailure(p)) return "🔴";
  if (hasPartial(p)) return "🟠";
  return isSettled(p) ? "🟢" : "🟡";
}

/** Describes active stages and collapses settled progress to one word. */
export function describeProgress(p: Progress): string {
  if (isSettled(p) && !hasFailure(p) && !hasPartial(p)) return "complete";

  const parts: string[] = [];
  for (const key of ORDER) {
    const stage = p[key];
    if (stage === "skipped") continue;
    if (stage === "waiting" && key === "index" && p.needed !== undefined) {
      parts.push(`index needs ${p.needed} more`);
      continue;
    }
    parts.push(
      `${key} ${stage === "done" ? "✓" : stage === "running" ? "…" : stage === "partial" ? "partial" : stage === "failed" ? "failed" : "◦"}`,
    );
  }
  return parts.join(" · ");
}

/** Derives the four progress stages from current search state. */
export function deriveProgress(state: {
  /** False only before the usage history has loaded. */
  rankingReady: boolean;
  /** Cached indexes and learned searches still loading in the background. */
  backgroundPending?: boolean;
  /** Some cached paths could not be checked because of a deadline or read error. */
  memoryPartial?: boolean;
  /** Searching inside a folder rather than across the index. */
  scoped: boolean;
  /** Folder browsing reads direct children; it does not query the index. */
  directChildrenOnly?: boolean;
  /** The mdls pass over that folder's children. */
  folderMetaPending: boolean;
  folderFailed?: boolean;
  folderPartial?: boolean;
  /** The search bar is being used as a path bar. */
  isPathQuery: boolean;
  query: string;
  /** A bare `.`: hidden entries only, which the name index cannot answer. */
  isHiddenOnly: boolean;
  searching: boolean;
  searchFailed?: boolean;
  searchPartial?: boolean;
  /** Length of the term the index would be asked for. */
  termLength: number;
  minQuery: number;
  /** The mdls pass over the folder's entries. */
  rankingPending: boolean;
  rankingFailed?: boolean;
  rankingPartial?: boolean;
}): Progress {
  const index: Stage = state.directChildrenOnly
    ? "skipped"
    : state.searchFailed
      ? "failed"
      : state.isPathQuery || state.query === "" || state.isHiddenOnly
        ? "skipped"
        : state.searching
          ? "running"
          : state.searchPartial
            ? "partial"
            : state.termLength < state.minQuery
              ? "waiting"
              : "done";

  return {
    memory:
      !state.rankingReady || state.backgroundPending
        ? "running"
        : state.memoryPartial
          ? "partial"
          : "done",
    folder:
      state.scoped || state.isPathQuery
        ? state.folderFailed
          ? "failed"
          : state.folderPartial
            ? "partial"
            : state.folderMetaPending
              ? "running"
              : "done"
        : "skipped",
    index,
    ranking: state.rankingFailed
      ? "failed"
      : state.rankingPartial
        ? "partial"
        : state.rankingPending
          ? "running"
          : "done",
    needed:
      index === "waiting"
        ? Math.max(1, state.minQuery - state.termLength)
        : undefined,
  };
}
