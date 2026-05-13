import { execSync } from "child_process";
import { homedir } from "os";
import { basename } from "path";
import type { Context } from "./types";

export type BuildContextOptions = {
  /**
   * When `false` (Raycast extension host), skip `process.cwd()` / `git rev-parse`:
   * the host process cwd is not the user's terminal project, so git context would mislead the model.
   */
  useProcessWorkspace?: boolean;
};

export function BuildContext(options?: BuildContextOptions): Context {
  const useProcessWorkspace = options?.useProcessWorkspace !== false;

  const os =
    process.platform === "darwin"
      ? "macOS"
      : process.platform === "win32"
      ? "Windows"
      : "Linux";

  const shell = basename(process.env.SHELL ?? "") || "unknown";

  let repoRoot = "";
  let cwd = "";

  if (useProcessWorkspace) {
    cwd = process.cwd();
    try {
      repoRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
    } catch {
      // not in a git repo or git is not available
    }
  } else {
    // Raycast: avoid inventing a repository path; users can name paths in natural language.
    cwd = homedir();
  }

  return { os, shell, cwd, repoRoot };
}
