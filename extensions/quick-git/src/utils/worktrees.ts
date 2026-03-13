import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";

function parseGitDir(gitPath: string): string {
  return gitPath
    .replace(/^gitdir:/, "")
    .split(".git")[0]
    .trim();
}

/**
 * Find the directory for a worktree. If we are in the main repo then find the location of that worktree,
 * @param currentDir The root of the current directory
 * @param worktree The name of the worktree to check
 * @returns The full path to the worktree directory.
 */
export async function findWorktreeDir(currentDir: string, worktree: string): Promise<string> {
  let repoDir = currentDir;
  const gitPath = join(currentDir, ".git");
  const gitStats = await stat(gitPath);
  if (gitStats.isFile()) {
    repoDir = await readFile(gitPath, "utf-8").then(parseGitDir);
  }

  const path = join(repoDir, ".git", "worktrees", worktree, "gitdir");
  return readFile(path, "utf8")
    .then(parseGitDir)
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        return repoDir;
      }

      throw new Error("Could not find worktree");
    });
}
