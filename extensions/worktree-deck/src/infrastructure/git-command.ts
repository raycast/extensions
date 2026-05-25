import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { normalizeExternalCommandError } from "./external-command-error";

/**
 * git コマンド実行を Promise 化する
 */
const execFileAsync = promisify(execFile);

/**
 * git コマンドを共通オプション付きで実行する
 */
export async function execGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("git", ["--no-optional-locks", "-C", cwd, ...args], { cwd });
  } catch (error) {
    throw normalizeExternalCommandError(error, "git", "git-worktree");
  }
}
