import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const GIT_LAUNCH_STATUS_TIMEOUT_MS = 3000;

export type GitLaunchGateResult = {
  canProceed: boolean;
  message?: string;
};

export type GitRunner = (
  directory: string,
  args: string[],
  timeoutMs?: number,
) => Promise<{ stdout: string; timedOut: boolean; failed: boolean }>;

export type BranchTargetLookup = (worktreeKey: string) => string | undefined | null;

function asStdout(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

async function defaultGitRunner(
  directory: string,
  args: string[],
  timeoutMs = GIT_LAUNCH_STATUS_TIMEOUT_MS,
): Promise<{ stdout: string; timedOut: boolean; failed: boolean }> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: directory,
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      encoding: "utf8",
    });
    return { stdout: asStdout(stdout), timedOut: false, failed: false };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { killed?: boolean; stdout?: string };
    if (err.killed || err.code === "ETIMEDOUT") {
      return { stdout: "", timedOut: true, failed: true };
    }
    return {
      stdout: asStdout(err.stdout),
      timedOut: false,
      failed: true,
    };
  }
}

/** Normalize a git toplevel path to the Raycast-local branchTargets key. */
export function normalizeWorktreeKey(topLevelPath: string): string | null {
  const trimmed = topLevelPath.trim().replace(/\0/g, "");
  if (!trimmed) {
    return null;
  }
  const normalized = path.normalize(trimmed).replace(/[/\\]+$/, "");
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase();
}

export async function resolveWorktreeKey(
  directory: string,
  runGit: GitRunner = defaultGitRunner,
): Promise<string | null> {
  const trimmed = directory.trim();
  if (!trimmed) {
    return null;
  }

  const inside = await runGit(trimmed, ["rev-parse", "--is-inside-work-tree"]);
  if (inside.failed || inside.stdout.trim().toLowerCase() !== "true") {
    return null;
  }

  const topLevel = await runGit(trimmed, ["rev-parse", "--show-toplevel"]);
  if (topLevel.failed || !topLevel.stdout.trim()) {
    return null;
  }

  return normalizeWorktreeKey(topLevel.stdout.trim());
}

export type GitWorkingTreeStatus = {
  branch: string;
  isDirty: boolean;
  isDetached: boolean;
};

export async function getLaunchGitStatus(
  directory: string,
  runGit: GitRunner = defaultGitRunner,
): Promise<{ status: GitWorkingTreeStatus | null; timedOut: boolean; notRepo: boolean }> {
  const porcelain = await runGit(directory, ["status", "--porcelain"], GIT_LAUNCH_STATUS_TIMEOUT_MS);
  if (porcelain.timedOut) {
    return { status: null, timedOut: true, notRepo: false };
  }
  if (porcelain.failed) {
    return { status: null, timedOut: false, notRepo: true };
  }

  const branchResult = await runGit(directory, ["branch", "--show-current"], GIT_LAUNCH_STATUS_TIMEOUT_MS);
  if (branchResult.timedOut) {
    return { status: null, timedOut: true, notRepo: false };
  }
  if (branchResult.failed) {
    return { status: null, timedOut: false, notRepo: true };
  }

  const branch = branchResult.stdout.trim();
  const isDetached = branch.length === 0;
  return {
    status: {
      branch: isDetached ? "(detached)" : branch,
      isDirty: porcelain.stdout.trim().length > 0,
      isDetached,
    },
    timedOut: false,
    notRepo: false,
  };
}

export function isOnTargetBranch(status: GitWorkingTreeStatus, target: string): boolean {
  return !status.isDetached && status.branch === target;
}

export async function listLocalBranches(directory: string, runGit: GitRunner = defaultGitRunner): Promise<string[]> {
  const result = await runGit(directory, ["branch", "--list", "--format=%(refname:short)"]);
  if (result.failed) {
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isSafeGitBranchName(line));
}

/** Reject option-like or control-character branch names before argv use. */
export function isSafeGitBranchName(branch: string): boolean {
  const trimmed = branch.trim();
  if (!trimmed || trimmed.length > 255) {
    return false;
  }
  if (trimmed.startsWith("-") || trimmed.includes("\0") || trimmed.includes("\r") || trimmed.includes("\n")) {
    return false;
  }
  if (trimmed.includes("..") || trimmed.includes("\\") || /\s/.test(trimmed)) {
    return false;
  }
  return true;
}

export async function switchBranch(
  directory: string,
  branch: string,
  runGit: GitRunner = defaultGitRunner,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = branch.trim();
  if (!isSafeGitBranchName(trimmed)) {
    return { ok: false, error: "Invalid branch name." };
  }
  const result = await runGit(directory, ["switch", "--", trimmed], GIT_LAUNCH_STATUS_TIMEOUT_MS);
  if (result.failed) {
    return {
      ok: false,
      error: result.timedOut ? "Git switch timed out." : `Could not switch to branch '${trimmed}'.`,
    };
  }
  return { ok: true };
}

/**
 * Mirror Core WorkspaceGitLaunchGate.EvaluateBeforeLaunch for Raycast-local branchTargets.
 */
export async function evaluateGitLaunchGate(
  directory: string,
  blockDirtyBranchSwitch: boolean,
  getTarget: BranchTargetLookup,
  runGit: GitRunner = defaultGitRunner,
): Promise<GitLaunchGateResult> {
  const worktreeKey = await resolveWorktreeKey(directory, runGit);
  if (!worktreeKey) {
    return { canProceed: true };
  }

  const target = getTarget(worktreeKey)?.trim();
  if (!target) {
    return { canProceed: true };
  }
  if (!isSafeGitBranchName(target)) {
    return { canProceed: false, message: "Configured branch target is invalid." };
  }

  return ensureTargetBranch(directory, target, blockDirtyBranchSwitch, false, runGit);
}

/** After persisting a target: same gate with Core persistTargetOnFailure messaging. */
export async function evaluateAfterSettingTarget(
  directory: string,
  target: string,
  blockDirtyBranchSwitch: boolean,
  runGit: GitRunner = defaultGitRunner,
): Promise<GitLaunchGateResult> {
  const trimmed = target.trim();
  if (!isSafeGitBranchName(trimmed)) {
    return { canProceed: false, message: "Invalid branch name." };
  }
  return ensureTargetBranch(directory, trimmed, blockDirtyBranchSwitch, true, runGit);
}

async function ensureTargetBranch(
  directory: string,
  target: string,
  blockDirtyBranchSwitch: boolean,
  persistTargetOnFailure: boolean,
  runGit: GitRunner,
): Promise<GitLaunchGateResult> {
  const { status, timedOut, notRepo } = await getLaunchGitStatus(directory, runGit);

  if (timedOut) {
    return {
      canProceed: false,
      message: persistTargetOnFailure
        ? `Target set to ${target}, but Git status timed out before the branch could be checked.`
        : "Git status timed out before the configured branch target could be checked.",
    };
  }

  if (notRepo || !status) {
    return {
      canProceed: false,
      message: persistTargetOnFailure
        ? `Target set to ${target}, but this folder is not a git repository.`
        : "Git branch target is configured, but this folder is not a git repository.",
    };
  }

  if (isOnTargetBranch(status, target)) {
    return { canProceed: true };
  }

  if (status.isDirty && blockDirtyBranchSwitch) {
    return {
      canProceed: false,
      message: persistTargetOnFailure
        ? `Target set to ${target}, but not switched because the working tree has uncommitted changes.`
        : "The working tree has uncommitted changes. Switch or commit changes before launching.",
    };
  }

  const switched = await switchBranch(directory, target, runGit);
  if (!switched.ok) {
    return {
      canProceed: false,
      message: persistTargetOnFailure
        ? `Target set to ${target}, but not switched because ${switched.error}`
        : (switched.error ?? `Could not switch to branch '${target}'.`),
    };
  }

  return { canProceed: true };
}
