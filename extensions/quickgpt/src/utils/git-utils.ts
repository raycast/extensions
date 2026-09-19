import * as fs from "fs/promises";
import * as path from "path";
import { exec as callbackExec } from "child_process";
import { promisify } from "util";

const exec = promisify(callbackExec);

function convertGitUrlToWebUrl(gitUrl: string): string | null {
  try {
    if (gitUrl.startsWith("https://")) {
      const url = new URL(gitUrl);
      return `${url.protocol}//${url.hostname}${url.pathname.replace(/\.git$/, "")}`;
    }
    if (gitUrl.startsWith("git@")) {
      const match = gitUrl.match(/git@([^:]+):(.*)/);
      if (match) {
        const host = match[1];
        const repoPath = match[2].replace(/\.git$/, "");
        return `https://${host}/${repoPath}`;
      }
    }
  } catch (error) {
    console.error("Failed to parse git URL:", error);
  }
  return null;
}

export async function findRepoRoot(startPath: string): Promise<string | null> {
  let currentPath = startPath;
  let iterations = 0;

  while (currentPath !== path.dirname(currentPath) && iterations < 20) {
    iterations++;
    const gitPath = path.join(currentPath, ".git");

    try {
      const stats = await fs.stat(gitPath);
      if (stats.isDirectory()) {
        return currentPath;
      }
    } catch {
      // .git not found, continue searching parent directories
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
}

export async function generateGitLink(filePath: string): Promise<string | null> {
  try {
    const fileDir = path.dirname(filePath);
    const repoRoot = await findRepoRoot(fileDir);

    if (!repoRoot) return null;

    const [gitConfigContent, headContent] = await Promise.all([
      fs.readFile(path.join(repoRoot, ".git", "config"), "utf-8"),
      fs.readFile(path.join(repoRoot, ".git", "HEAD"), "utf-8"),
    ]);

    const remoteUrlMatch = gitConfigContent.match(/\[remote "origin"\]\s*url = (.+)/);
    if (!remoteUrlMatch) return null;

    const webUrl = convertGitUrlToWebUrl(remoteUrlMatch[1]);
    if (!webUrl) return null;

    const branchMatch = headContent.match(/ref: refs\/heads\/(.+)/);
    if (!branchMatch) return null;
    const branch = branchMatch[1].trim();

    const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, "/");

    return `${webUrl}/blob/${branch}/${encodeURI(relativePath)}`;
  } catch (error) {
    console.error("Error generating git link:", error);
    return null;
  }
}

export async function getGitDiff(filePath: string): Promise<string> {
  const repoRoot = await findRepoRoot(filePath);
  if (!repoRoot) {
    return "";
  }

  try {
    const diffSections: string[] = [];

    try {
      const { stdout: unstagedDiff } = await exec("git diff", { cwd: repoRoot });
      if (unstagedDiff.trim()) {
        diffSections.push("=== Unstaged Changes (Working Directory) ===\n\n" + unstagedDiff);
      }
    } catch {
      // Ignore if command fails
    }

    try {
      const { stdout: stagedDiff } = await exec("git diff --cached", { cwd: repoRoot });
      if (stagedDiff.trim()) {
        diffSections.push("=== Staged Changes (Index) ===\n\n" + stagedDiff);
      }
    } catch {
      // Ignore if command fails
    }

    let targetBranch = "";
    try {
      await exec("git show-ref --verify --quiet refs/heads/master", { cwd: repoRoot });
      targetBranch = "master";
    } catch {
      try {
        await exec("git show-ref --verify --quiet refs/heads/main", { cwd: repoRoot });
        targetBranch = "main";
      } catch {
        targetBranch = "";
      }
    }

    if (targetBranch) {
      try {
        const { stdout: currentBranch } = await exec("git branch --show-current", { cwd: repoRoot });
        if (currentBranch.trim() && currentBranch.trim() !== targetBranch) {
          const { stdout: branchDiff } = await exec(`git diff ${targetBranch}...${currentBranch.trim()}`, {
            cwd: repoRoot,
          });
          if (branchDiff.trim()) {
            diffSections.push(
              `=== Committed Changes (${currentBranch.trim()} vs ${targetBranch}) ===\n\n` + branchDiff,
            );
          }
        }
      } catch {
        // Ignore if branch comparison fails
      }
    }

    if (diffSections.length === 0) {
      return "";
    }

    return diffSections.join("\n\n");
  } catch (error) {
    if (error instanceof Error) {
      return `[Git command failed: ${error.message}]`;
    }
    return "[An unknown error occurred while running git diff]";
  }
}
