import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { GitStatus } from "../types";

// ============================================
// Git Status Detection
// ============================================

export function getGitStatus(path: string): GitStatus {
  if (!existsSync(path)) {
    return { isGitRepo: false };
  }

  const gitDir = join(path, ".git");
  if (!existsSync(gitDir)) {
    return { isGitRepo: false };
  }

  try {
    const branch = execGit(path, "rev-parse --abbrev-ref HEAD");
    const status = execGit(path, "status --porcelain");
    const hasChanges = status.length > 0;

    const { ahead, behind } = getAheadBehind(path);

    return {
      isGitRepo: true,
      branch,
      hasChanges,
      ahead,
      behind,
    };
  } catch (error) {
    console.error(`Failed to get git status for ${path}:`, error);
    return { isGitRepo: false };
  }
}

export function getCombinedGitStatus(paths: string[]): GitStatus | null {
  if (paths.length === 0) return null;

  if (paths.length === 1) {
    return getGitStatus(paths[0]);
  }

  const statuses = paths.map(getGitStatus);
  const gitRepos = statuses.filter((s) => s.isGitRepo);

  if (gitRepos.length === 0) {
    return { isGitRepo: false };
  }

  const branches = [...new Set(gitRepos.map((s) => s.branch).filter(Boolean))];
  const hasChanges = gitRepos.some((s) => s.hasChanges);

  return {
    isGitRepo: true,
    branch: branches.length === 1 ? branches[0] : `${branches.length} branches`,
    hasChanges,
  };
}

// ============================================
// Helpers
// ============================================

function execGit(cwd: string, command: string): string {
  return execSync(`git ${command}`, {
    cwd,
    encoding: "utf-8",
    timeout: 5000,
  }).trim();
}

function getAheadBehind(path: string): { ahead: number; behind: number } {
  try {
    const result = execGit(path, "rev-list --left-right --count HEAD...@{upstream} 2>/dev/null");
    const [aheadStr, behindStr] = result.split(/\s+/);
    return {
      ahead: parseInt(aheadStr, 10) || 0,
      behind: parseInt(behindStr, 10) || 0,
    };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}
