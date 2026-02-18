import { exec } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

import { GitStatus } from "@/types";

const execAsync = promisify(exec);

const GIT_TIMEOUT_MS = 5_000;

let gitAvailableCache: boolean | null = null;

export async function isGitAvailable(): Promise<boolean> {
  if (gitAvailableCache !== null) {
    return gitAvailableCache;
  }

  try {
    await execAsync("git --version", { timeout: GIT_TIMEOUT_MS });
    gitAvailableCache = true;
  } catch {
    gitAvailableCache = false;
  }

  return gitAvailableCache;
}

// Single shell invocation gets branch + ahead/behind in one process spawn
const GIT_STATUS_COMMAND = `
branch=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null);
counts=$(git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "0 0");
echo "$branch";
echo "$counts"
`.trim();

export async function getGitStatus(repoPath: string): Promise<GitStatus | null> {
  if (!(await isGitAvailable())) {
    return null;
  }

  const gitDir = path.join(repoPath, ".git");
  if (!existsSync(gitDir)) {
    return null;
  }

  try {
    const { stdout } = await execAsync(GIT_STATUS_COMMAND, {
      cwd: repoPath,
      encoding: "utf8",
      shell: "/bin/sh",
      timeout: GIT_TIMEOUT_MS,
    });

    const lines = stdout.trim().split("\n");
    const branchName = lines[0]?.trim();

    if (!branchName) {
      return null;
    }

    const [ahead, behind] = (lines[1]?.trim().split(/\s+/) || []).map(Number);

    return {
      branch: branchName,
      pull: behind || 0,
      push: ahead || 0,
    };
  } catch {
    return null;
  }
}
