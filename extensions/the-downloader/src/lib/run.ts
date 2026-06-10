import { spawn, ChildProcess } from "node:child_process";

/**
 * Default watchdog idle window. Real downloads emit progress lines well within
 * two minutes even on slow networks; a longer gap usually means the child is
 * wedged on auth or a network stall. Production call sites override this via
 * the `networkIdleTimeoutSec` user preference; tests and direct callers may
 * accept the default.
 */
export const DEFAULT_IDLE_MS = 120_000;

/** Grace period after SIGTERM before escalating to SIGKILL, so a child that ignores SIGTERM still exits and `close` still fires. */
const KILL_GRACE_MS = 4_000;

export type RunOptions = {
  /** Maximum ms of silence (no stdout/stderr) before the child is killed and the promise rejects. */
  idleMs: number;
  /** Environment for the child. Defaults to the parent's `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Called per stdout chunk so callers can parse incremental progress. The full stdout is also returned on close. */
  onStdoutChunk?: (chunk: string) => void;
  /** Called per complete stdout line (newline-buffered across chunks). Use this when a line could be split across stream chunks — e.g. a tagged filepath that must be matched whole. */
  onStdoutLine?: (line: string) => void;
  /** Called per stderr chunk. The full stderr is also returned on close. */
  onStderrChunk?: (chunk: string) => void;
  /** Override the rejection message when the watchdog fires. */
  idleKillMessage?: string;
  /** Aborting the signal kills the child and rejects with an AbortError. Used for cancel buttons and component-unmount cleanup. */
  abortSignal?: AbortSignal;
};

/** Thrown when a child is killed because the caller aborted its signal. Distinct from a watchdog kill — caller-initiated, not the timeout. */
export class AbortError extends Error {
  constructor() {
    super("aborted");
    this.name = "AbortError";
  }
}

export type RunResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

/**
 * Spawn a child process with hang-prevention baked in: stdin is closed so the
 * tool cannot block waiting on an interactive prompt (yt-dlp's 2FA prompt,
 * gallery-dl's password ask, etc.), and an idle watchdog kills the child when
 * neither stream emits anything for `idleMs`. An abort signal cancels the same
 * way.
 *
 * Termination (abort or idle) does NOT settle the promise immediately — it
 * sends SIGTERM, escalates to SIGKILL after a grace period, and waits for the
 * real `close` event before rejecting. That way the promise is only settled
 * once the child has actually exited, so callers (and unmount cleanup) have
 * real evidence the process is gone before they start anything new against the
 * same output. Callers parse stdout/stderr themselves and decide what a
 * non-zero exit means.
 */
export function runWithWatchdog(binary: string, args: string[], options: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // Reject up front if the signal is already aborted — no point spawning.
    if (options.abortSignal?.aborted) {
      reject(new AbortError());
      return;
    }
    const isPosix = process.platform !== "win32";
    const child = spawn(binary, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env ?? process.env,
      // On POSIX, run the child as its own process-group leader so termination
      // can signal the whole group (negative pid) — otherwise killing yt-dlp
      // orphans its ffmpeg grandchild, which keeps re-encoding under launchd.
      // Windows has no POSIX process groups; fall back to a direct child kill.
      detached: isPosix,
    });
    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    let settled = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    // Why we're tearing the child down, if at all. The `close` handler reads
    // this to decide whether to resolve (normal exit) or reject (abort/idle).
    let termination: "abort" | "idle" | null = null;

    const cleanup = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (killTimer) clearTimeout(killTimer);
      options.abortSignal?.removeEventListener("abort", onAbort);
    };
    const settleResolve = (value: RunResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    // Signal the child's whole process group on POSIX (negative pid) so
    // grandchildren — yt-dlp's ffmpeg post-processor — die with it instead of
    // orphaning. Falls back to a direct child kill when there's no group
    // (Windows) or the group has already gone. No signal → SIGTERM.
    const killGroup = (signal?: NodeJS.Signals) => {
      const pid = child.pid;
      if (isPosix && typeof pid === "number") {
        try {
          if (signal) process.kill(-pid, signal);
          else process.kill(-pid);
          return;
        } catch {
          /* group already gone — fall through to a direct child kill */
        }
      }
      try {
        if (signal) child.kill(signal);
        else child.kill();
      } catch {
        /* child may already be dead */
      }
    };

    const beginTermination = (reason: "abort" | "idle") => {
      if (settled || termination) return;
      termination = reason;
      if (idleTimer) clearTimeout(idleTimer);
      // Escalate to SIGKILL if the child ignores SIGTERM, so `close` is
      // guaranteed to fire and the promise can settle. Set the timer before
      // the first signal so a synchronous close (in tests) can clear it.
      killTimer = setTimeout(() => killGroup("SIGKILL"), KILL_GRACE_MS);
      killGroup();
    };

    const onAbort = () => beginTermination("abort");
    options.abortSignal?.addEventListener("abort", onAbort, { once: true });

    const resetIdle = () => {
      if (settled || termination) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => beginTermination("idle"), options.idleMs);
    };
    resetIdle();

    child.stdout?.on("data", (data: Buffer) => {
      resetIdle();
      const text = data.toString();
      stdout += text;
      options.onStdoutChunk?.(text);
      if (options.onStdoutLine) {
        stdoutLineBuffer += text;
        // Treat a bare \r as a line break too: progress-style tools (yt-dlp
        // without --newline, Rich-based CLIs) redraw lines with \r when stdout
        // is a pipe, and Windows tools emit \r\n. Splitting on \n alone would
        // buffer those updates until the process finished.
        const lines = stdoutLineBuffer.split(/\r\n|\r|\n/);
        stdoutLineBuffer = lines.pop() ?? "";
        for (const line of lines) options.onStdoutLine(line);
      }
    });
    child.stderr?.on("data", (data: Buffer) => {
      resetIdle();
      const text = data.toString();
      stderr += text;
      options.onStderrChunk?.(text);
    });
    child.on("error", (err) => settleReject(err));
    child.on("close", (code) => {
      // Flush any trailing partial line (a final line with no newline).
      if (options.onStdoutLine && stdoutLineBuffer) {
        options.onStdoutLine(stdoutLineBuffer);
        stdoutLineBuffer = "";
      }
      if (termination === "abort") {
        settleReject(new AbortError());
      } else if (termination === "idle") {
        const seconds = Math.round(options.idleMs / 1000);
        settleReject(
          new Error(
            options.idleKillMessage ??
              `${binary} produced no output for ${seconds}s and was killed. This usually means it is stuck on an auth or network step; retry, or raise the Network: Idle Timeout preference.`,
          ),
        );
      } else {
        settleResolve({ code, stdout, stderr });
      }
    });
  });
}

export type { ChildProcess };
