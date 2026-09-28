import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Resolved branches per directory, so remounts (scrolling, filtering) reuse
// them instead of spawning `git` again. In-flight requests are shared too,
// so items pointing at the same folder don't duplicate work.
const branchCache = new Map<string, string | null>();
const branchInflight = new Map<string, Promise<string | null>>();

export async function getGitBranch(directoryPath: string): Promise<string | null> {
  let dir = directoryPath;
  if (dir.startsWith("file://")) {
    dir = fileURLToPath(dir);
  }

  try {
    const stats = await fs.promises.stat(dir);
    if (!stats.isDirectory()) {
      dir = path.dirname(dir);
    }
  } catch {
    return null;
  }

  if (branchCache.has(dir)) {
    return branchCache.get(dir) ?? null;
  }
  const pending = branchInflight.get(dir);
  if (pending) {
    return pending;
  }
  // resolveGitBranch never rejects (unexpected errors resolve to null), so
  // sharing the promise cannot produce unhandled rejections.
  const promise = resolveGitBranch(dir).then((branch) => {
    branchCache.set(dir, branch);
    branchInflight.delete(dir);
    return branch;
  });
  branchInflight.set(dir, promise);
  return promise;
}

async function resolveGitBranch(directoryPath: string): Promise<string | null> {
  try {
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
    // Only show error if it's not the common "not a git repository" error, not the "ambiguous argument 'HEAD'" error,
    // and not a missing git binary
    if (
      error instanceof Error &&
      !error.message.includes("not a git repository") &&
      !error.message.includes("ambiguous argument 'HEAD'") &&
      !error.message.includes("ENOENT")
    ) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Git Error",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: () => {
            Clipboard.copy(message);
            showHUD("Copied to clipboard");
          },
        },
      });
    }
    return null;
  }
}
