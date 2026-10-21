import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  branchExistsLocal,
  directoryExists,
  sanitizeBranchName,
  worktreeDir,
} from "./worktrees";

const execFileAsync = promisify(execFile);
const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(gitExecutable, ["-C", cwd, ...args], {
    timeout: 60_000,
  });
  return stdout;
}

/**
 * Creates a worktree for the PR without touching the primary checkout:
 * the PR head is fetched from origin (the repo the dashboard lists PRs from)
 * and a new `pr-N` branch is created directly inside the worktree.
 */
export async function checkoutPullRequestAsWorktree(
  repoRoot: string,
  pr: { number: number; headRefName: string },
): Promise<{ worktreePath: string }> {
  const localBranch = `pr-${pr.number}`;
  const dirBranch = `pr-${pr.number}-${sanitizeBranchName(pr.headRefName)}`;
  const worktreePath = worktreeDir(repoRoot, dirBranch);

  if (await directoryExists(worktreePath)) {
    throw new Error(`Worktree already exists at ${worktreePath}`);
  }
  if (await branchExistsLocal(repoRoot, localBranch)) {
    throw new Error(
      `Branch ${localBranch} already exists in ${repoRoot}; delete it before checking out PR #${pr.number} as a worktree`,
    );
  }

  try {
    await runGit(repoRoot, ["fetch", "origin", `refs/pull/${pr.number}/head`]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`git fetch of PR #${pr.number} head failed: ${message}`);
  }

  try {
    await runGit(repoRoot, [
      "worktree",
      "add",
      "-b",
      localBranch,
      worktreePath,
      "FETCH_HEAD",
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`git worktree add failed: ${message}`);
  }

  return { worktreePath };
}
