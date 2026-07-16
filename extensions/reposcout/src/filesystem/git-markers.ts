import type { RepositoryKind } from "../types/repository";

/**
 * Pure helpers that classify a directory as a Git repository based only on the
 * names of its immediate entries. No filesystem access happens here so the rules
 * are trivially unit-testable. See docs/ARCHITECTURE.md ("Discovery flow").
 */

/** A single directory entry reduced to what classification needs. */
export interface DirEntryInfo {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
}

/** Files/directories that, together, indicate a bare Git repository. */
const BARE_MARKERS = ["HEAD", "objects", "refs"] as const;

/**
 * Classify a directory given its immediate entries.
 *
 * - A `.git` directory  → `normal` working tree.
 * - A `.git` file       → `worktree` (linked worktree or submodule pointer).
 * - `HEAD` + `objects` + `refs` present with no `.git` → `bare` repository.
 *
 * @param entries            The directory's immediate entries.
 * @param includeBareRepos   Whether to detect bare repositories at all.
 * @returns The detected {@link RepositoryKind}, or `null` when the directory is
 *          not itself a repository root.
 */
export function detectRepositoryKind(
  entries: readonly DirEntryInfo[],
  includeBareRepos: boolean,
): RepositoryKind | null {
  let hasGitDir = false;
  let hasGitFile = false;
  const names = new Set<string>();

  for (const entry of entries) {
    names.add(entry.name);
    if (entry.name === ".git") {
      if (entry.isDirectory) {
        hasGitDir = true;
      } else if (entry.isFile) {
        hasGitFile = true;
      }
    }
  }

  if (hasGitDir) {
    return "normal";
  }
  if (hasGitFile) {
    return "worktree";
  }
  if (includeBareRepos && BARE_MARKERS.every((marker) => names.has(marker))) {
    return "bare";
  }
  return null;
}
