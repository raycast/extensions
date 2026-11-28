import { spawn, ChildProcess } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

/**
 * Default watchdog idle window. Real downloads emit progress lines well within
 * two minutes even on slow networks; a longer gap usually means the child is
 * wedged on auth or a network stall. Production call sites override this via
 * the `networkIdleTimeoutSec` user preference; tests and direct callers may
 * accept the default.
 */
export const DEFAULT_IDLE_MS = 120_000;

/**
 * Most characters kept of each output stream. Callers read the tail (yt-dlp's
 * final file path, a tool's error), and progress output from a long download
 * would otherwise pile up in memory for nothing.
 */
export const MAX_RETAINED_OUTPUT = 1_000_000;

/** Keep the last `MAX_RETAINED_OUTPUT` characters of `text`. */
const tail = (text: string) => (text.length > MAX_RETAINED_OUTPUT ? text.slice(-MAX_RETAINED_OUTPUT) : text);

/** Grace period after SIGTERM before escalating to SIGKILL, so a child that ignores SIGTERM still exits and `close` still fires. */
const KILL_GRACE_MS = 4_000;

/** The longest delay a timer takes (2^31-1 ms, about 24.8 days); a longer one fires immediately. */
export const MAX_TIMER_MS = 2_147_483_647;

/**
 * True when yt-dlp says the link has nothing it can download (no extractor for
 * the site, or a page without a video) rather than a network, sign-in or tool
 * failure. The form probes links with yt-dlp, so it knows this before a
 * download starts.
 */
export function isNoMediaError(text: string): boolean {
  return /Unsupported URL|No video formats found|There's no video in this|No media found/i.test(text);
}

/** What the form and the download view say when yt-dlp finds nothing to download at the link. */
export const NO_MEDIA_MESSAGE =
  "No video or audio on this page that yt-dlp can download. To keep the page, choose Website.";

/**
 * The part of a tool's error output worth showing in a toast: yt-dlp's last
 * `ERROR:` line, or else the last few lines — never the pages of warnings that
 * can come before them. The full text stays available to Copy Error.
 */
export function errorSummary(text: string, max = 500): string {
  if (isNoMediaError(text)) return NO_MEDIA_MESSAGE;
  // optparse (yt-dlp) and argparse (gallery-dl, spotDL) on an option they don't know yet.
  const unknown = /(?:no such option|unrecognized arguments?):\s*(--?[\w-]+)/i.exec(text);
  if (unknown) {
    const tool = /^([\w.-]+):\s*error:/m.exec(text)?.[1] ?? "The tool";
    return `${tool} doesn't know ${unknown[1]}: it is older than this extension expects. Update it (Update Libraries), then try again.`;
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors = lines.filter((line) => /^ERROR:/i.test(line));
  const picked = errors.at(-1) ?? lines.slice(-3).join("\n");
  return picked.length > max ? `${picked.slice(0, max)}…` : picked;
}

export type RunOptions = {
  /** Maximum ms of silence (no stdout/stderr) before the child is killed and the promise rejects. */
  idleMs: number;
  /**
   * Multiplies `idleMs` each time the window restarts — for a phase that is
   * silent by nature (ffmpeg merging or converting a long video).
   */
  idleScale?: () => number;
  /** Environment for the child. Defaults to the parent's `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Working directory for the child. Defaults to the parent's. */
  cwd?: string;
  /** Called per stdout chunk so callers can parse incremental progress. Stdout's tail is also returned on close. */
  onStdoutChunk?: (chunk: string) => void;
  /** Called per complete stdout line (newline-buffered across chunks). Use this when a line could be split across stream chunks — e.g. a tagged filepath that must be matched whole. */
  onStdoutLine?: (line: string) => void;
  /** Called per stderr chunk. Stderr's tail is also returned on close. */
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

/**
 * End `child` together with everything it started. On POSIX that is its
 * process group (negative pid; the child must have been spawned `detached`),
 * so grandchildren — yt-dlp's ffmpeg post-processor, its deno — die with it
 * instead of orphaning. Windows has no process groups: `taskkill /T` ends the
 * whole tree instead (a PyInstaller `yt-dlp.exe` is a launcher whose Python
 * child would otherwise keep running). Falls back to a direct kill when
 * neither works, and for an escalation signal. No signal → SIGTERM.
 */
export function killProcessTree(child: Pick<ChildProcess, "pid" | "kill">, signal?: NodeJS.Signals): void {
  const pid = child.pid;
  const isPosix = process.platform !== "win32";
  if (isPosix && typeof pid === "number") {
    try {
      if (signal) process.kill(-pid, signal);
      else process.kill(-pid);
      return;
    } catch {
      /* group already gone, or not a group leader — fall through to a direct kill */
    }
  }
  if (!isPosix && typeof pid === "number" && !signal) {
    // Don't kill the parent first: its children would be orphaned and out of taskkill's reach.
    try {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }).on("error", () =>
        child.kill(),
      );
      return;
    } catch {
      /* taskkill unavailable — fall through to a direct kill */
    }
  }
  try {
    if (signal) child.kill(signal);
    else child.kill();
  } catch {
    /* child may already be dead */
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
      // The Python tools (yt-dlp, gallery-dl, spotDL) write a pipe in Windows'
      // ANSI code page unless told otherwise, dropping the characters it lacks
      // from titles and saved paths; this side reads UTF-8.
      env: { PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", ...(options.env ?? process.env) },
      cwd: options.cwd,
      // No console window flashing up for every tool run on Windows.
      windowsHide: true,
      // On POSIX, run the child as its own process-group leader so termination
      // can signal the whole group (negative pid) — otherwise killing yt-dlp
      // orphans its ffmpeg grandchild, which keeps re-encoding under launchd.
      // Windows has no POSIX process groups; fall back to a direct child kill.
      detached: isPosix,
    });
    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    // Decoders, so a character split across two chunks isn't read as two broken halves.
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");
    // The window the last timer was set with, for the message when it fires.
    let idleWindowMs = options.idleMs;
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

    const killGroup = (signal?: NodeJS.Signals) => killProcessTree(child, signal);

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
      // Past 2^31-1 ms, setTimeout fires at once instead of never.
      idleWindowMs = Math.min(options.idleMs * (options.idleScale?.() ?? 1), MAX_TIMER_MS);
      idleTimer = setTimeout(() => beginTermination("idle"), idleWindowMs);
    };
    resetIdle();

    child.stdout?.on("data", (data: Buffer) => {
      const text = stdoutDecoder.write(data);
      stdout = tail(stdout + text);
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
      // After the lines were handled: a line may change `idleScale` (a post-processing step starting).
      resetIdle();
    });
    child.stderr?.on("data", (data: Buffer) => {
      resetIdle();
      const text = stderrDecoder.write(data);
      stderr = tail(stderr + text);
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
        const seconds = Math.round(idleWindowMs / 1000);
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
