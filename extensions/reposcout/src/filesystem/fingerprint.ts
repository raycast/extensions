import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { RepositoryKind } from "../types/repository";

/**
 * Computes a cheap fingerprint of a repository's Git state so the indexer can
 * decide whether cached Git metadata is still valid without shelling out to git.
 *
 * The fingerprint combines the modification times (and sizes) of the files that
 * change whenever the branch, HEAD, or working index moves. If none can be
 * stat-ed the fingerprint is `null`, which forces a re-enrichment.
 */

/** Files whose mtime reflects Git state, relative to the `.git` directory. */
const STATE_FILES = ["HEAD", "index"] as const;

/**
 * Resolve the directory that holds Git state files for a repository root.
 * For normal repos this is `<root>/.git`; for bare repos it is the root itself.
 * For linked worktrees (`.git` is a file) we cannot cheaply resolve the real
 * gitdir here, so we fall back to the root and let enrichment decide.
 */
function gitStateDir(repoPath: string, kind: RepositoryKind): string {
  return kind === "bare" ? repoPath : join(repoPath, ".git");
}

/**
 * Compute a fingerprint string for a repository, or `null` if no state file
 * could be read (e.g. corrupted or permission-restricted `.git`).
 *
 * @param repoPath Absolute path to the repository root.
 * @param kind     The repository kind, which determines where state lives.
 */
export async function computeFingerprint(
  repoPath: string,
  kind: RepositoryKind,
): Promise<string | null> {
  const dir = gitStateDir(repoPath, kind);
  const parts: string[] = [];

  for (const file of STATE_FILES) {
    try {
      const info = await stat(join(dir, file));
      parts.push(`${file}:${info.mtimeMs}:${info.size}`);
    } catch {
      // Missing state file is expected for some kinds (e.g. a fresh repo has no
      // index). Skip it rather than failing the whole fingerprint.
    }
  }

  return parts.length > 0 ? parts.join("|") : null;
}
