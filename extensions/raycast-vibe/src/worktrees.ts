import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";

export type Worktree = {
  path: string;
  branch?: string;
  sha: string;
  isMain: boolean;
  detached: boolean;
  dirty?: boolean;
};

async function runGit(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    gitExecutable,
    ["-C", repoRoot, ...args],
    {
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return stdout;
}

export async function listWorktrees(repoRoot: string): Promise<Worktree[]> {
  const stdout = await runGit(repoRoot, ["worktree", "list", "--porcelain"]);
  const worktrees: Worktree[] = [];
  let current: Partial<Worktree> & { path?: string } = {};
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length) };
    } else if (line.startsWith("HEAD ")) {
      current.sha = line.slice("HEAD ".length, "HEAD ".length + 7);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch refs/heads/".length);
      current.detached = false;
    } else if (line === "detached") {
      current.detached = true;
    } else if (line === "" && current.path) {
      worktrees.push({
        path: current.path,
        branch: current.branch,
        sha: current.sha ?? "",
        isMain: worktrees.length === 0,
        detached: current.detached ?? false,
      });
      current = {};
    }
  }
  if (current.path) {
    worktrees.push({
      path: current.path,
      branch: current.branch,
      sha: current.sha ?? "",
      isMain: worktrees.length === 0,
      detached: current.detached ?? false,
    });
  }
  return worktrees;
}

export async function enrichDirty(worktrees: Worktree[]): Promise<Worktree[]> {
  return Promise.all(
    worktrees.map(async (wt) => {
      try {
        const stdout = await runGit(wt.path, [
          "status",
          "--porcelain",
          "--untracked-files=no",
        ]);
        return { ...wt, dirty: stdout.trim().length > 0 };
      } catch {
        return wt;
      }
    }),
  );
}

export function sanitizeBranchName(branch: string): string {
  return branch.replaceAll("/", "-").replaceAll("\\", "-");
}

export function worktreeDir(repoRoot: string, branch: string): string {
  return join(repoRoot, ".worktrees", sanitizeBranchName(branch));
}

export async function validateBranchName(
  branch: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const trimmed = branch.trim();
  if (!trimmed) return { ok: false, reason: "Branch name is required." };
  try {
    await execFileAsync(
      gitExecutable,
      ["check-ref-format", "--branch", trimmed],
      {
        timeout: 5_000,
      },
    );
    return { ok: true };
  } catch {
    return { ok: false, reason: "Invalid git branch name." };
  }
}

export async function branchExistsLocal(
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

export async function directoryExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function addWorktree(
  repoRoot: string,
  args: {
    branch: string;
    useExistingBranch?: boolean;
    remote?: string;
  },
): Promise<string> {
  const dir = worktreeDir(repoRoot, args.branch);
  const gitArgs: string[] = ["worktree", "add"];
  if (args.remote) {
    gitArgs.push(dir, "-b", args.branch, args.remote);
  } else if (args.useExistingBranch) {
    gitArgs.push(dir, args.branch);
  } else {
    gitArgs.push(dir, "-b", args.branch);
  }
  await runGit(repoRoot, gitArgs);
  return dir;
}

export async function removeWorktree(
  repoRoot: string,
  worktreePath: string,
): Promise<void> {
  await runGit(repoRoot, ["worktree", "remove", worktreePath]);
}
