import * as fs from "fs";
import * as path from "path";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { trash } from "@raycast/api";

const execFileAsync = promisify(execFile);

const DEBUG_GIT = false;
function logGitError(message: string, ...args: unknown[]): void {
  if (DEBUG_GIT) console.error(message, ...args);
}

export interface WorktreeItem {
  path: string;
  branch: string;
  repoName: string;
  isMain: boolean;
  repoRoot: string;
  /** Directory mtime for "most recent first" sorting (optional). */
  lastModifiedMs?: number;
}

interface RepoInfo {
  path: string;
}

function isGitRepo(dirPath: string): boolean {
  const gitPath = path.join(dirPath, ".git");
  if (!fs.existsSync(gitPath)) return false;
  const stat = fs.statSync(gitPath);
  if (stat.isDirectory()) return true;
  if (stat.isFile()) {
    try {
      const content = fs.readFileSync(gitPath, "utf-8");
      return content.startsWith("gitdir:");
    } catch {
      return false;
    }
  }
  return false;
}

function getMainRepoPath(worktreePath: string): string | null {
  const gitFile = path.join(worktreePath, ".git");
  if (!fs.existsSync(gitFile) || !fs.statSync(gitFile).isFile()) return null;
  try {
    const content = fs.readFileSync(gitFile, "utf-8").trim();
    const match = content.match(/^gitdir:\s*(.+)$/m);
    if (!match) return null;
    let gitDir = match[1].trim();
    if (!path.isAbsolute(gitDir)) {
      gitDir = path.resolve(path.dirname(gitFile), gitDir);
    }
    const commondirPath = path.join(gitDir, "commondir");
    if (fs.existsSync(commondirPath)) {
      const common = fs.readFileSync(commondirPath, "utf-8").trim();
      const mainGitDir = path.isAbsolute(common) ? common : path.resolve(path.dirname(commondirPath), common);
      return path.dirname(mainGitDir);
    }
    return path.dirname(gitDir);
  } catch {
    return null;
  }
}

const MAX_REPO_SCAN_DEPTH = 15;

function collectReposRecursive(dirPath: string, results: RepoInfo[], seenMainPaths: Set<string>, depth: number): void {
  if (depth > MAX_REPO_SCAN_DEPTH) return;
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return;
  try {
    if (isGitRepo(dirPath)) {
      const stat = fs.statSync(path.join(dirPath, ".git"));
      if (stat.isFile()) {
        const mainPath = getMainRepoPath(dirPath);
        if (mainPath && !seenMainPaths.has(mainPath)) {
          seenMainPaths.add(mainPath);
          results.push({ path: mainPath });
        }
      } else {
        const resolved = path.resolve(dirPath);
        if (!seenMainPaths.has(resolved)) {
          seenMainPaths.add(resolved);
          results.push({ path: resolved });
        }
      }
      return;
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name === ".git") continue;
      collectReposRecursive(path.join(dirPath, ent.name), results, seenMainPaths, depth + 1);
    }
  } catch (err) {
    logGitError("getReposForRoot error", dirPath, err);
  }
}

export function getReposForRoot(rootPath: string): RepoInfo[] {
  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    return [];
  }
  const results: RepoInfo[] = [];
  const seenMainPaths = new Set<string>();
  collectReposRecursive(path.resolve(rootPath), results, seenMainPaths, 0);
  return results;
}

interface WorktreeLine {
  path: string;
  branch?: string;
  bare?: boolean;
}

async function getWorktreesForRepo(repoPath: string): Promise<WorktreeLine[]> {
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) return [];
  const absPath = path.resolve(repoPath);
  try {
    const { stdout } = await execFileAsync("git", ["worktree", "list", "--porcelain"], {
      cwd: absPath,
      maxBuffer: 1024 * 1024,
    });
    const lines: WorktreeLine[] = [];
    let current: Partial<WorktreeLine> = {};
    for (const line of stdout.split("\n")) {
      if (line.startsWith("worktree ")) {
        if (current.path) lines.push(current as WorktreeLine);
        current = { path: line.slice(9).trim() };
      } else if (line.startsWith("branch ")) {
        current.branch = line
          .slice(7)
          .trim()
          .replace(/^refs\/heads\//, "");
      } else if (line.startsWith("bare")) {
        current.bare = true;
      } else if (line === "" && current.path) {
        lines.push(current as WorktreeLine);
        current = {};
      }
    }
    if (current.path) lines.push(current as WorktreeLine);
    return lines;
  } catch (err) {
    logGitError("getWorktreesForRepo error", repoPath, err);
    return [];
  }
}

export async function getAllWorktrees(roots: string[]): Promise<WorktreeItem[]> {
  const items: WorktreeItem[] = [];
  const seenPaths = new Set<string>();

  for (const root of roots) {
    const repos = getReposForRoot(root);
    for (const repo of repos) {
      const worktrees = await getWorktreesForRepo(repo.path);
      const repoName = path.basename(repo.path);
      const mainPath = worktrees[0]?.path || repo.path;
      for (let i = 0; i < worktrees.length; i++) {
        const wt = worktrees[i];
        const absPath = path.isAbsolute(wt.path) ? wt.path : path.resolve(repo.path, wt.path);
        if (seenPaths.has(absPath)) continue;
        seenPaths.add(absPath);
        let lastModifiedMs: number | undefined;
        try {
          lastModifiedMs = fs.statSync(absPath).mtimeMs;
        } catch {
          // path may not exist in edge cases
        }
        items.push({
          path: absPath,
          branch: wt.branch ?? "(detached)",
          repoName,
          isMain: absPath === mainPath,
          repoRoot: repo.path,
          lastModifiedMs,
        });
      }
    }
  }

  return items.sort((a, b) => {
    const aMs = a.lastModifiedMs ?? 0;
    const bMs = b.lastModifiedMs ?? 0;
    if (bMs !== aMs) return bMs - aMs;
    return a.path.localeCompare(b.path);
  });
}

export async function getBranches(repoPath: string): Promise<string[]> {
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) return [];
  const absPath = path.resolve(repoPath);
  try {
    const { stdout } = await execFileAsync("git", ["branch", "-a", "--format=%(refname:short)"], {
      cwd: absPath,
      maxBuffer: 512 * 1024,
    });
    const branches = new Set<string>();
    for (const line of stdout.split("\n")) {
      const b = line.trim();
      if (!b || b === "HEAD") continue;
      const name = b.replace(/^remotes\/[^/]+\//, "").replace(/^(origin|upstream)\//, "");
      if (name) branches.add(name);
    }
    return Array.from(branches).sort();
  } catch (err) {
    logGitError("getBranches error", repoPath, err);
    return [];
  }
}

async function hasLocalBranch(repoPath: string, branch: string): Promise<boolean> {
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) return false;
  try {
    await execFileAsync("git", ["rev-parse", "--verify", `refs/heads/${branch}`], {
      cwd: path.resolve(repoPath),
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

async function getDefaultRemote(repoPath: string): Promise<string | null> {
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) return null;
  try {
    const { stdout } = await execFileAsync("git", ["remote"], {
      cwd: path.resolve(repoPath),
      maxBuffer: 1024 * 1024,
    });
    const remotes = stdout
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    return remotes.includes("origin") ? "origin" : (remotes[0] ?? null);
  } catch {
    return null;
  }
}

/** If the local branch has an upstream (e.g. origin/master), return it; otherwise null. */
async function getUpstreamRef(repoPath: string, localBranch: string): Promise<string | null> {
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) return null;
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", `${localBranch}@{upstream}`], {
      cwd: path.resolve(repoPath),
      maxBuffer: 1024 * 1024,
    });
    const ref = stdout.trim();
    return ref && !ref.includes("@") ? ref : null;
  } catch {
    return null;
  }
}

export async function createWorktree(
  repoPath: string,
  branch: string,
  worktreePath: string
): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) {
    return { success: false, error: "Repository not found" };
  }
  const absRepo = path.resolve(repoPath);
  const absWorktree = path.isAbsolute(worktreePath) ? worktreePath : path.resolve(path.dirname(absRepo), worktreePath);
  if (branch.trim() === "") {
    return { success: false, error: "Branch is required" };
  }
  const branchName = branch.trim();
  try {
    const localExists = await hasLocalBranch(absRepo, branchName);
    if (localExists) {
      await execFileAsync("git", ["worktree", "add", absWorktree, branchName], {
        cwd: absRepo,
        maxBuffer: 1024 * 1024,
      });
    } else {
      const remote = await getDefaultRemote(absRepo);
      const startPoint = remote ? `${remote}/${branchName}` : branchName;
      await execFileAsync("git", ["worktree", "add", "-b", branchName, absWorktree, startPoint], {
        cwd: absRepo,
        maxBuffer: 1024 * 1024,
      });
    }
    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string; stderr?: string; stdout?: string };
    const parts = [e.message, e.stderr, e.stdout].filter(Boolean) as string[];
    const message = parts.length > 0 ? parts.join("\n").trim() : String(err);
    return { success: false, error: message };
  }
}

const CANCELLED_ERROR = "Cancelled";

function runGitWorktreeAdd(
  cwd: string,
  args: string[],
  opts?: { onLog?: (text: string) => void; signal?: AbortSignal }
): Promise<{ success: boolean; error?: string }> {
  const { onLog, signal } = opts ?? {};
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ success: false, error: CANCELLED_ERROR });
      return;
    }
    const stderrChunks: string[] = [];
    const proc = spawn("git", ["worktree", "add", ...args], { cwd });
    const onAbort = () => {
      try {
        proc.kill("SIGTERM");
      } catch {
        // already exited
      }
      resolve({ success: false, error: CANCELLED_ERROR });
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    const push = (data: Buffer | string) => {
      const text = data.toString();
      stderrChunks.push(text);
      onLog?.(text);
    };
    if (proc.stdout) proc.stdout.on("data", push);
    if (proc.stderr) proc.stderr.on("data", push);
    proc.on("close", (code: number | null) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        resolve({ success: false, error: CANCELLED_ERROR });
        return;
      }
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderrChunks.join("").trim() || `git worktree add exited with ${code}`,
        });
      }
    });
    proc.on("error", (err: Error) => {
      signal?.removeEventListener("abort", onAbort);
      resolve({ success: false, error: err.message });
    });
  });
}

export const createWorktreeCancelledError = CANCELLED_ERROR;

const DEFAULT_REMOTE = "origin";

/** Set branch upstream to origin/branch so push works from the worktree (e.g. in Cursor). Run from worktree dir. */
async function setBranchUpstream(worktreePath: string, branch: string, onLog?: (text: string) => void): Promise<void> {
  const opts = { cwd: worktreePath, maxBuffer: 1024 * 1024 };
  try {
    await execFileAsync("git", ["branch", "--set-upstream-to", `${DEFAULT_REMOTE}/${branch}`, branch], opts);
    onLog?.(`Upstream set to ${DEFAULT_REMOTE}/${branch} (push will work from the worktree).\n`);
  } catch (err: unknown) {
    try {
      await execFileAsync("git", ["config", `branch.${branch}.remote`, DEFAULT_REMOTE], opts);
      await execFileAsync("git", ["config", `branch.${branch}.merge`, `refs/heads/${branch}`], opts);
      onLog?.(`Upstream set to ${DEFAULT_REMOTE}/${branch} (push will work from the worktree).\n`);
    } catch {
      const msg = err instanceof Error ? err.message : String(err);
      onLog?.(`Note: could not set upstream (${msg}). Run "git push -u origin ${branch}" once in the worktree.\n`);
    }
  }
}

export async function createWorktreeFromBase(
  repoPath: string,
  newBranchName: string,
  worktreePath: string,
  baseBranch: string,
  opts?: { onLog?: (text: string) => void; signal?: AbortSignal }
): Promise<{ success: boolean; error?: string }> {
  const { onLog, signal } = opts ?? {};
  if (!fs.existsSync(repoPath) || !isGitRepo(repoPath)) {
    return { success: false, error: "Repository not found" };
  }
  const absRepo = path.resolve(repoPath);
  const base = (baseBranch ?? "").trim();
  if (!base) return { success: false, error: "Base branch is required" };
  const branch = newBranchName.trim().replace(/[/\\]/g, "-");
  if (!branch) return { success: false, error: "Worktree name is required" };
  const absWorktree = path.isAbsolute(worktreePath) ? worktreePath : path.resolve(path.dirname(absRepo), worktreePath);
  try {
    if (signal?.aborted) return { success: false, error: CANCELLED_ERROR };
    onLog?.("Checking if branch exists…\n");
    const branchExists = await hasLocalBranch(absRepo, branch);
    if (signal?.aborted) return { success: false, error: CANCELLED_ERROR };
    if (branchExists) {
      onLog?.(`Adding worktree at ${absWorktree} (existing branch ${branch})…\n`);
      return runGitWorktreeAdd(absRepo, [absWorktree, branch], { onLog, signal });
    }
    const startPoint = (await getUpstreamRef(absRepo, base)) || base;
    if (startPoint !== base) {
      onLog?.(`Creating branch "${branch}" from ${startPoint} at ${absWorktree}…\n`);
    } else {
      onLog?.(`Creating branch "${branch}" and worktree at ${absWorktree}…\n`);
    }
    const result = await runGitWorktreeAdd(absRepo, ["-b", branch, absWorktree, startPoint], { onLog, signal });
    if (result.success) {
      await setBranchUpstream(absWorktree, branch, onLog);
    }
    return result;
  } catch (err: unknown) {
    const e = err as { message?: string; stderr?: string; stdout?: string };
    const parts = [e.message, e.stderr, e.stdout].filter(Boolean) as string[];
    const message = parts.length > 0 ? parts.join("\n").trim() : String(err);
    return { success: false, error: message };
  }
}

/**
 * Removes a worktree (unregisters it and deletes the folder).
 * Run from the main repo; does not remove the main worktree.
 */
export async function removeWorktree(
  repoRoot: string,
  worktreePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await execFileAsync("git", ["worktree", "remove", worktreePath, "--force"], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    });
    if (fs.existsSync(worktreePath)) {
      await trash(worktreePath);
    }
    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string; stderr?: string; stdout?: string };
    const parts = [e.message, e.stderr, e.stdout].filter(Boolean) as string[];
    const message = parts.length > 0 ? parts.join("\n").trim() : String(err);
    return { success: false, error: message };
  }
}
