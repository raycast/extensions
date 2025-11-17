import { exec } from "child_process";
import { promisify } from "util";
import { Repository, GitStatus, GitCommit } from "./types";

const execAsync = promisify(exec);

export class GitUtils {
  static async isGitRepository(path: string): Promise<boolean> {
    try {
      await execAsync("git rev-parse --git-dir", { cwd: path });
      return true;
    } catch {
      return false;
    }
  }

  static async hasCommits(path: string): Promise<boolean> {
    try {
      await execAsync("git rev-parse HEAD", { cwd: path });
      return true;
    } catch {
      return false;
    }
  }

  static async getRepositoryInfo(path: string): Promise<Partial<Repository>> {
    try {
      // First check if the repository has any commits
      const hasCommits = await this.hasCommits(path);

      const promises = [
        execAsync("git symbolic-ref --short HEAD", { cwd: path }),
        execAsync("git status --porcelain", { cwd: path }),
        hasCommits
          ? execAsync("git log --oneline -5 --pretty=format:'%h|%s|%an|%ai'", { cwd: path })
          : Promise.resolve({ stdout: "", stderr: "" }),
        execAsync("git rev-list --left-right --count HEAD...@{u}", { cwd: path }),
      ];

      const [branchResult, statusResult, logResult, aheadBehindResult] = await Promise.allSettled(promises);

      const branch = branchResult.status === "fulfilled" ? branchResult.value.stdout.trim() : "unknown";

      const statusLines =
        statusResult.status === "fulfilled"
          ? statusResult.value.stdout.split("\n").filter((line) => line.length > 0)
          : [];

      // 计算详细的 Git 状态
      let staged = 0,
        unstaged = 0,
        untracked = 0;
      statusLines.forEach((line) => {
        const status = line.substring(0, 2);
        if (status === "??") untracked++;
        else if (status[0] !== " " && status[0] !== "?") staged++;
        else if (status[1] !== " ") unstaged++;
      });

      let ahead = 0,
        behind = 0;
      if (aheadBehindResult.status === "fulfilled") {
        const [a, b] = aheadBehindResult.value.stdout.trim().split("\t").map(Number);
        ahead = a || 0;
        behind = b || 0;
      }

      const hasChanges = statusLines.length > 0;
      const changedFilesCount = statusLines.length;
      const gitStatus: GitStatus = { staged, unstaged, untracked, ahead, behind };

      let lastCommit: GitCommit | undefined;
      if (logResult.status === "fulfilled" && logResult.value.stdout) {
        const latestCommit = logResult.value.stdout.split("\n")[0];
        if (latestCommit) {
          const [hash, message, author, dateStr] = latestCommit.split("|");
          lastCommit = {
            hash,
            message,
            author,
            date: new Date(dateStr),
          };
        }
      }

      return {
        path,
        name: path.split("/").pop() || "Unknown",
        branch,
        hasChanges,
        changedFilesCount,
        lastCommit,
        gitStatus,
      };
    } catch (error) {
      console.error(`Failed to get repository info for ${path}:`, error);
      return {
        path,
        name: path.split("/").pop() || "Unknown",
        branch: "unknown",
        hasChanges: false,
        changedFilesCount: 0,
        gitStatus: { staged: 0, unstaged: 0, untracked: 0, ahead: 0, behind: 0 },
      };
    }
  }

  static async getGitStatus(path: string): Promise<GitStatus> {
    try {
      const [statusResult, aheadBehindResult] = await Promise.allSettled([
        execAsync("git status --porcelain", { cwd: path }),
        execAsync("git rev-list --left-right --count HEAD...@{u}", { cwd: path }),
      ]);

      const statusLines =
        statusResult.status === "fulfilled"
          ? statusResult.value.stdout.split("\n").filter((line) => line.length > 0)
          : [];

      let staged = 0,
        unstaged = 0,
        untracked = 0;
      statusLines.forEach((line) => {
        const status = line.substring(0, 2);
        if (status === "??") untracked++;
        else if (status[0] !== " " && status[0] !== "?") staged++;
        else if (status[1] !== " ") unstaged++;
      });

      let ahead = 0,
        behind = 0;
      if (aheadBehindResult.status === "fulfilled") {
        const [a, b] = aheadBehindResult.value.stdout.trim().split("\t").map(Number);
        ahead = a || 0;
        behind = b || 0;
      }

      return { staged, unstaged, untracked, ahead, behind };
    } catch (error) {
      console.error(`Failed to get git status for ${path}:`, error);
      return { staged: 0, unstaged: 0, untracked: 0, ahead: 0, behind: 0 };
    }
  }

  static async getRecentCommits(path: string, count: number = 5): Promise<GitCommit[]> {
    try {
      // Check if the repository has any commits first
      const hasCommits = await this.hasCommits(path);
      if (!hasCommits) {
        return [];
      }

      const { stdout } = await execAsync(`git log --oneline -${count} --pretty=format:'%h|%s|%an|%ai'`, { cwd: path });

      return stdout
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => {
          const [hash, message, author, dateStr] = line.split("|");
          return {
            hash,
            message,
            author,
            date: new Date(dateStr),
          };
        });
    } catch (error) {
      console.error(`Failed to get recent commits for ${path}:`, error);
      return [];
    }
  }

  static async getStagedDiff(path: string): Promise<string> {
    try {
      const { stdout } = await execAsync("git diff --cached", { cwd: path });
      return stdout;
    } catch (error) {
      console.error(`Failed to get staged diff for ${path}:`, error);
      return "";
    }
  }

  static async getWorkingDiff(path: string): Promise<string> {
    try {
      const { stdout } = await execAsync("git diff", { cwd: path });
      return stdout;
    } catch (error) {
      console.error(`Failed to get working diff for ${path}:`, error);
      return "";
    }
  }

  static async getCombinedDiff(path: string): Promise<string> {
    const [working, staged] = await Promise.all([this.getWorkingDiff(path), this.getStagedDiff(path)]);
    if (!working.trim() && !staged.trim()) return "";
    let combined = "";
    if (working.trim()) {
      combined += `# Unstaged Changes\n${working}\n`;
    }
    if (staged.trim()) {
      combined += `# Staged Changes\n${staged}\n`;
    }
    return combined.trim();
  }

  static async stageAllFiles(path: string): Promise<void> {
    try {
      await execAsync("git add .", { cwd: path });
    } catch (error) {
      console.error(`Failed to stage files for ${path}:`, error);
      throw new Error(`Failed to stage files: ${error}`);
    }
  }

  static async unlockRepository(path: string): Promise<void> {
    try {
      const { promises: fs } = await import("fs");
      const p = await import("path");
      const lockPath = p.join(path, ".git", "index.lock");
      await fs.rm(lockPath, { force: true });
    } catch (error) {
      console.error(`Failed to unlock repository at ${path}:`, error);
      throw new Error(`Failed to unlock repository: ${error}`);
    }
  }

  static async commit(path: string, message: string): Promise<void> {
    try {
      await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: path });
    } catch (error) {
      console.error(`Failed to commit for ${path}:`, error);
      throw new Error(`Failed to commit: ${error}`);
    }
  }

  static async push(path: string): Promise<void> {
    try {
      await execAsync("git push", { cwd: path });
    } catch (error) {
      console.error(`Failed to push for ${path}:`, error);
      throw new Error(`Failed to push: ${error}`);
    }
  }

  static async scanForRepositories(
    basePath: string,
    maxDepth: number = Infinity,
    currentDepth: number = 0,
  ): Promise<string[]> {
    if (currentDepth >= maxDepth) return [];

    try {
      const { promises: fs } = await import("fs");
      const path = await import("path");

      const items = await fs.readdir(basePath, { withFileTypes: true });
      const repositories: string[] = [];

      for (const item of items) {
        const fullPath = path.join(basePath, item.name);

        if (item.isDirectory() && item.name === ".git") {
          repositories.push(basePath);
          continue;
        }

        if (item.isDirectory() && !item.name.startsWith(".")) {
          const nestedRepos = await this.scanForRepositories(fullPath, maxDepth, currentDepth + 1);
          repositories.push(...nestedRepos);
        }
      }

      return repositories;
    } catch (error) {
      console.error(`Failed to scan ${basePath}:`, error);
      return [];
    }
  }

  static async getReadmeContent(repoPath: string): Promise<string | undefined> {
    try {
      const { promises: fs } = await import("fs");
      const path = await import("path");

      const readmeFiles = ["README.md", "README.MD", "readme.md", "README", "README.txt"];

      for (const filename of readmeFiles) {
        try {
          const readmePath = path.join(repoPath, filename);
          const content = await fs.readFile(readmePath, "utf-8");
          return content;
        } catch {
          continue;
        }
      }

      return undefined;
    } catch (error) {
      console.error(`Failed to read README for ${repoPath}:`, error);
      return undefined;
    }
  }

  static async getFileStructure(repoPath: string, maxDepth: number = 2): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `find . -maxdepth ${maxDepth} -type f -not -path '*/\\.git/*' -not -path '*/node_modules/*' | head -50`,
        {
          cwd: repoPath,
        },
      );
      return stdout;
    } catch (error) {
      console.error(`Failed to get file structure for ${repoPath}:`, error);
      return "";
    }
  }
}
