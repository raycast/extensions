import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  directoryExists,
  removeWorktree,
  sanitizeBranchName,
  worktreeDir,
} from "./worktrees";

const execFileAsync = promisify(execFile);
const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(gitExecutable, ["-C", cwd, ...args], {
    timeout: 30_000,
  });
  return stdout;
}

async function runGh(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("gh", args, {
    cwd,
    timeout: 60_000,
  });
  return stdout;
}

async function currentHeadRef(repoRoot: string): Promise<string | undefined> {
  try {
    return (await runGit(repoRoot, ["symbolic-ref", "HEAD"])).trim();
  } catch {
    return undefined;
  }
}

async function branchExists(
  repoRoot: string,
  branch: string,
): Promise<boolean> {
  try {
    await runGit(repoRoot, [
      "show-ref",
      "--verify",
      "--quiet",
      `refs/heads/${branch}`,
    ]);
    return true;
  } catch {
    return false;
  }
}

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

  const headBefore = await currentHeadRef(repoRoot);
  const branchExistedBefore = await branchExists(repoRoot, localBranch);

  try {
    await runGh(repoRoot, [
      "pr",
      "checkout",
      String(pr.number),
      "--branch",
      localBranch,
      "--force",
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`gh pr checkout failed: ${message}`);
  }

  const headAfter = await currentHeadRef(repoRoot);
  if (headBefore && headAfter && headBefore !== headAfter) {
    try {
      await runGit(repoRoot, ["switch", "-"]);
    } catch {
      // best effort; the toast layer surfaces the caveat if needed
    }
  }

  try {
    await runGit(repoRoot, ["worktree", "add", worktreePath, localBranch]);
  } catch (error) {
    if (!branchExistedBefore) {
      try {
        await runGit(repoRoot, ["branch", "-D", localBranch]);
      } catch {
        // ignore cleanup failure
      }
    }
    if (await directoryExists(worktreePath)) {
      try {
        await removeWorktree(repoRoot, worktreePath);
      } catch {
        // ignore cleanup failure
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`git worktree add failed: ${message}`);
  }

  return { worktreePath };
}
