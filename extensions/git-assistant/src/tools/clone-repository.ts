import { exec } from "child_process";
import { Tool } from "@raycast/api";
import { homedir } from "os";
import { existsSync } from "fs";

type Input = {
  /**
   * The git repository URL to clone (SSH or HTTPS format)
   * Examples: git@github.com:user/repo.git, https://github.com/user/repo.git
   */
  repoUrl: string;
  /**
   * The target directory where the repository should be cloned
   * The repository will be cloned into a subdirectory named after the repo
   * Example: ~/Developer/personal -> ~/Developer/personal/repo-name
   */
  targetDirectory: string;
};

type CloneResult = {
  success: boolean;
  clonedPath: string;
  repoName: string;
  message: string;
};

/**
 * Extracts the repository name from a git URL
 * Supports SSH (git@github.com:user/repo.git) and HTTPS (https://github.com/user/repo.git)
 */
function extractRepoName(url: string): string {
  // Remove trailing .git if present
  const cleanUrl = url.replace(/\.git$/, "");

  // Extract the last part of the path (repo name)
  // Works for both SSH and HTTPS URLs
  const parts = cleanUrl.split(/[/:]/);
  return parts[parts.length - 1];
}

/**
 * Expands ~ to the home directory
 */
function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return path.replace("~", homedir());
  }
  if (path === "~") {
    return homedir();
  }
  return path;
}

/**
 * Clone a git repository to a target directory.
 * The repository name is extracted from the URL and used as the subdirectory name.
 */
export default async function (input: Input): Promise<CloneResult> {
  return new Promise((resolve, reject) => {
    const repoName = extractRepoName(input.repoUrl);
    const targetDir = expandPath(input.targetDirectory);
    const clonePath = `${targetDir}/${repoName}`;

    // Check if target directory exists
    if (!existsSync(targetDir)) {
      reject(`Target directory does not exist: ${targetDir}`);
      return;
    }

    // Check if clone destination already exists
    if (existsSync(clonePath)) {
      reject(`Destination path already exists: ${clonePath}`);
      return;
    }

    const command = `git clone "${input.repoUrl}" "${clonePath}"`;

    exec(command, { cwd: targetDir }, (error, stdout, stderr) => {
      if (error) {
        reject(`Clone failed: ${stderr || error.message}`);
        return;
      }

      resolve({
        success: true,
        clonedPath: clonePath,
        repoName: repoName,
        message: `Successfully cloned ${repoName} to ${clonePath}`,
      });
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const repoName = extractRepoName(input.repoUrl);
  const targetDir = expandPath(input.targetDirectory);
  const clonePath = `${targetDir}/${repoName}`;

  return {
    message: `Clone repository "${repoName}"?`,
    info: [
      { name: "Repository URL", value: input.repoUrl },
      { name: "Clone to", value: clonePath },
    ],
  };
};
