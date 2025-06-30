import { showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function getGitBranch(directoryPath: string): Promise<string | null> {
  try {
    // If it's a file URL, convert it to a file path
    if (directoryPath.startsWith("file://")) {
      directoryPath = fileURLToPath(directoryPath);
    }

    // If it's a file path, get its directory
    const stats = await fs.promises.stat(directoryPath);
    if (!stats.isDirectory()) {
      directoryPath = path.dirname(directoryPath);
    }

    // Check if .git directory exists
    const gitDir = path.join(directoryPath, ".git");
    const isGitRepo = await fs.promises
      .access(gitDir)
      .then(() => true)
      .catch(() => false);

    if (!isGitRepo) {
      return null;
    }

    // Run git command to get current branch
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directoryPath,
      encoding: "utf-8",
    });

    const branch = stdout.trim();
    return branch || null;
  } catch (error) {
    // Only show error if it's not the common "not a git repository" error and not the "ambiguous argument 'HEAD'" error
    if (
      error instanceof Error &&
      !error.message.includes("not a git repository") &&
      !error.message.includes("ambiguous argument 'HEAD'")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Git Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
