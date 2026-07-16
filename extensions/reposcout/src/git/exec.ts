import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { type Result, err, ok } from "../utils/result";

const execFileAsync = promisify(execFile);

/**
 * Thin, safe wrapper around invoking the `git` CLI. We use `execFile` (not
 * `exec`) so arguments are passed as an array and never interpolated into a
 * shell, eliminating shell-injection risk from repository paths.
 *
 * All expected failures (missing git, non-zero exit, timeout) are returned as
 * the error branch of a {@link Result} rather than thrown, so enrichment can
 * degrade gracefully on broken or corrupted repositories.
 */

/** Options for a single git invocation. */
export interface GitExecOptions {
  /** Working directory / repository to run against (git's `-C`). */
  readonly cwd: string;
  /** Milliseconds before the git process is killed. Defaults to 5000. */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Run `git <args>` inside `options.cwd` and return trimmed stdout.
 *
 * @param args    Arguments passed to git (already split; no shell parsing).
 * @param options See {@link GitExecOptions}.
 */
export async function runGit(args: readonly string[], options: GitExecOptions): Promise<Result<string, Error>> {
  try {
    const { stdout } = await execFileAsync("git", [...args], {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      // Keep git non-interactive so a repo needing credentials never hangs.
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" },
    });
    return ok(stdout.trim());
  } catch (cause) {
    return err(cause instanceof Error ? cause : new Error(String(cause)));
  }
}
