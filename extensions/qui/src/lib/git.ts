import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Finds the enclosing git repository of `dir` and its current branch, if any. */
export async function findGitInfo(dir: string): Promise<{ root: string; branch?: string } | undefined> {
  const home = os.homedir();
  let current = path.resolve(dir);
  // Don't treat the home directory or anything above it as a project.
  while (current.startsWith(home + path.sep)) {
    const dotGit = path.join(current, ".git");
    const info = await stat(dotGit).catch(() => undefined);
    if (info) {
      return { root: current, branch: await readBranch(dotGit, info.isDirectory()) };
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

async function readBranch(dotGit: string, isDirectory: boolean): Promise<string | undefined> {
  try {
    let gitDir = dotGit;
    if (!isDirectory) {
      // Worktrees and submodules: `.git` is a file containing `gitdir: <path>`.
      const pointer = (await readFile(dotGit, "utf8")).trim().replace(/^gitdir:\s*/, "");
      gitDir = path.resolve(path.dirname(dotGit), pointer);
    }
    const head = (await readFile(path.join(gitDir, "HEAD"), "utf8")).trim();
    const ref = head.match(/^ref: refs\/heads\/(.+)$/);
    return ref ? ref[1] : head.slice(0, 7);
  } catch {
    return undefined;
  }
}
