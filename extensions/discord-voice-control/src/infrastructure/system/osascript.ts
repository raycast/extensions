import { execFile } from "node:child_process";

/**
 * Minimal, sandboxed wrapper around `osascript`. This is the *only* place the extension shells out.
 *
 * Safety notes:
 *  - We pass the script via argv (`-e`), never via an interpolated shell string, so there is no
 *    shell to inject into. Callers must still build scripts from validated/constant inputs only
 *    (the shortcut parser guarantees the key is a single character and modifiers are a fixed set).
 *  - Raw stdout/stderr never leaves infrastructure: callers translate {@link OsascriptResult} into
 *    domain reason codes; user-facing messages come from the catalog.
 */

export interface OsascriptResult {
  readonly ok: boolean;
  /** Trimmed stdout (only meaningful when `ok`). */
  readonly stdout: string;
  /** Trimmed stderr / error text (only meaningful when `!ok`). */
  readonly stderr: string;
  /** True when the process did not finish within the timeout. */
  readonly timedOut: boolean;
}

export interface RunOsascriptOptions {
  readonly timeoutMs: number;
}

/** Run one or more `osascript` `-e` lines. Never throws for script errors — returns a result. */
export function runOsascript(lines: readonly string[], options: RunOsascriptOptions): Promise<OsascriptResult> {
  const args = lines.flatMap((line) => ["-e", line]);
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/osascript",
      args,
      { timeout: options.timeoutMs, killSignal: "SIGKILL" },
      (error, stdout, stderr) => {
        const out = (stdout ?? "").trim();
        const err = (stderr ?? "").trim();
        if (!error) {
          resolve({ ok: true, stdout: out, stderr: err, timedOut: false });
          return;
        }
        const timedOut =
          (error as NodeJS.ErrnoException & { killed?: boolean; signal?: string }).killed === true ||
          (error as NodeJS.ErrnoException & { signal?: string }).signal === "SIGKILL";
        resolve({
          ok: false,
          stdout: out,
          stderr: err || error.message,
          timedOut,
        });
      },
    );
  });
}

/**
 * Classify a failed osascript result into one of the conditions the control path cares about.
 * Pure string inspection — exported so it can be unit tested without spawning a process.
 */
export type OsascriptErrorKind = "permission" | "timeout" | "other";

export function classifyOsascriptError(result: OsascriptResult): OsascriptErrorKind {
  if (result.timedOut) {
    return "timeout";
  }
  const text = `${result.stderr}`.toLowerCase();
  // macOS surfaces missing Accessibility as "not allowed assistive access" / error 1002.
  if (
    text.includes("not allowed") ||
    text.includes("assistive") ||
    text.includes("accessibility") ||
    text.includes("1002") ||
    text.includes("-1719") // "can’t get process ... not allowed"
  ) {
    return "permission";
  }
  return "other";
}
