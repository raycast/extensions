import { execSync } from "child_process";
import { basename } from "path";
import type { Context } from "./types";

export function BuildContext(): Context {
  const os =
    process.platform === "darwin"
      ? "macOS"
      : process.platform === "win32"
      ? "Windows"
      : "Linux";

  const shell = basename(process.env.SHELL ?? "") || "unknown";

  let repoRoot = "";
  try {
    repoRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    // not in a git repo or git is not available
  }

  return { os, shell, cwd: process.cwd(), repoRoot };
}
