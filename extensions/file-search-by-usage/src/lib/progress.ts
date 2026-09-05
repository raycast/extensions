/** Search stages displayed in the section status. */
export type Stage =
  "done" | "running" | "waiting" | "skipped" | "partial" | "failed";

export type Progress = {
  /** Visit history and pins needed for initial ranking. */
  memory: Stage;
  /** Reading the folder in scope, and its usage metadata. */
  folder: Stage;
  /** The mdfind pass, or the walk that replaces it. */
  spotlight: Stage;
  /** Usage metadata for Spotlight results. */
  ranking: Stage;
  /** Characters still needed before a whole-disk search is worth running. */
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
  "spotlight",
  "ranking",
];

const LABEL: Record<string, string> = {
  memory: "memory",
  folder: "folder",
  spotlight: "Spotlight",
  ranking: "ranking",
};

export function isSettled(p: Progress): boolean {
  return ORDER.every(
    (k) =>
      p[k] === "done" ||
      p[k] === "skipped" ||
      p[k] === "partial" ||
      p[k] === "failed",
  );
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
    if (stage === "waiting" && key === "spotlight" && p.needed !== undefined) {
      parts.push(`Spotlight needs ${p.needed} more`);
      continue;
    }
    parts.push(
      `${LABEL[key]} ${stage === "done" ? "✓" : stage === "running" ? "…" : stage === "partial" ? "partial" : stage === "failed" ? "failed" : "◦"}`,
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
  /** Searching inside a folder rather than the whole disk. */
  scoped: boolean;
  /** The mdls pass over that folder's children. */
  folderMetaPending: boolean;
  folderFailed?: boolean;
  folderPartial?: boolean;
  /** The search bar is being used as a path bar. */
  isPathQuery: boolean;
  query: string;
  /** A bare `.`: hidden entries only, which Spotlight cannot answer. */
  isHiddenOnly: boolean;
  searching: boolean;
  searchFailed?: boolean;
  /** Length of the term Spotlight would be asked for. */
  termLength: number;
  minQuery: number;
  /** The mdls pass over what Spotlight returned. */
  rankingPending: boolean;
  rankingFailed?: boolean;
  rankingPartial?: boolean;
}): Progress {
  const spotlight: Stage = state.searchFailed
    ? "failed"
    : state.isPathQuery || state.query === "" || state.isHiddenOnly
      ? "skipped"
      : state.searching
        ? "running"
        : state.termLength < state.minQuery
          ? "waiting"
          : "done";

  return {
    memory: state.rankingReady && !state.backgroundPending ? "done" : "running",
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
    spotlight,
    ranking: state.rankingFailed
      ? "failed"
      : state.rankingPartial
        ? "partial"
        : state.rankingPending
          ? "running"
          : "done",
    needed:
      spotlight === "waiting"
        ? Math.max(1, state.minQuery - state.termLength)
        : undefined,
  };
}
