/** Owner scope as reported by Claude Code's artifact listing. */
export type ArtifactOwner = "mine" | "shared";

/**
 * One row of the local index.
 *
 * Only `id`, `title`, and `url` are guaranteed. Everything else is optional
 * because the two writers supply different subsets:
 *
 * - The one-time **seed** has no `cwd` (it was captured from the artifact
 *   listing, which reports no project context), and shared artifacts carry no
 *   `updated` date at all.
 * - The **hook** knows `cwd` and therefore `project`, but writes whatever the
 *   `Artifact` tool response actually contains.
 */
export interface Artifact {
  id: string;
  title: string;
  url: string;
  /** ISO date (YYYY-MM-DD). Absent on shared artifacts — never assume present. */
  updated?: string;
  owner?: ArtifactOwner;
  /** Basename of `cwd`. Absent on seeded rows; impossible to backfill. */
  project?: string;
  /** Absolute path the artifact was published from, for "Open Project Folder". */
  cwd?: string;
}

/** On-disk shape of the index file. */
export interface ArtifactIndex {
  /** Schema version. Reserves the seam for a future reconcile/refresh command. */
  version: number;
  artifacts: Artifact[];
}

/** Why the index could not be read, so the empty state can say something specific. */
export type IndexProblem = "missing" | "malformed";

export interface IndexResult {
  artifacts: Artifact[];
  /** Distinct project names present in the index, sorted, for the filter dropdown. */
  projects: string[];
  problem?: IndexProblem;
  /** Parse/read error detail, surfaced via the Copy Error action. */
  errorMessage?: string;
}
