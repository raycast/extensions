import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  pull?: number;
  push?: number;
}

export async function getGitStatus(repoPath: string): Promise<GitStatus | null> {
  const gitDir = path.join(repoPath, ".git");
  if (!existsSync(gitDir)) {
    return null;
  }

  try {
    const { stdout: branch } = await execAsync("git symbolic-ref --short HEAD || git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
      encoding: "utf8",
    });

    const branchName = branch.trim();

    try {
      const { stdout: counts } = await execAsync("git rev-list --left-right --count HEAD...@{u}", {
        cwd: repoPath,
        encoding: "utf8",
      });
      const [ahead, behind] = counts.trim().split(/\s+/).map(Number);
      return {
        branch: branchName,
        pull: behind || 0,
        push: ahead || 0,
      };
    } catch {
      return {
        branch: branchName,
      };
    }
  } catch {
    return null;
  }
}
