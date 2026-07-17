/**
 * WinGet process execution.
 *
 * winget is spawned directly with an argv array — no cmd.exe wrapper, no
 * escaping. Verified live (winget 1.28): output to pipes is clean UTF-8 on
 * every code path including CJK names (no `chcp 65001` needed), and exit
 * codes come through unchanged as HRESULTs. A cmd.exe wrapper would also
 * silently drop empty arguments, which `search -q ""` requires.
 *
 * The extension worker's environment is a strict allow-list missing variables
 * winget and installers may rely on (LOCALAPPDATA, APPDATA, USERPROFILE,
 * SystemRoot, ComSpec, PATHEXT, TMP) — children inherit it, so we repair the
 * env at spawn time.
 */

import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";

import { CancelledError, StaleProcessError, WingetNotFoundError } from "./errors";
import { type ExecutorResult, type SpawnWingetOptions } from "./types";

/** Kill the process when a watched operation produces no output for this long. */
const STALE_PROCESS_TIMEOUT_MS = 5 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 30_000;

/**
 * Maximum concurrently running winget QUERY processes (mutations are globally
 * locked). 3 lets the mutable-slice refresh (list + upgrade + pin list) run
 * fully parallel; details prefetch is sequential and shares the budget.
 */
const QUERY_CONCURRENCY = 3;

let configuredWingetPath: string | null = null;

/** Set from the `wingetPath` preference at command entry; null = "winget" on PATH. */
function configureWingetPath(path: string | null | undefined): void {
  configuredWingetPath = path?.trim() ? path.trim() : null;
}

function wingetExecutable(): string {
  return configuredWingetPath ?? "winget";
}

/** Children inherit the worker's stripped env; restore what Windows tools expect. */
function repairedChildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const home = env.USERPROFILE ?? homedir();
  env.USERPROFILE ??= home;
  env.HOMEDRIVE ??= home.slice(0, 2);
  env.HOMEPATH ??= home.slice(2);
  env.LOCALAPPDATA ??= join(home, "AppData", "Local");
  env.APPDATA ??= join(home, "AppData", "Roaming");
  env.SystemRoot ??= "C:\\Windows";
  env.windir ??= env.SystemRoot;
  env.ComSpec ??= join(env.SystemRoot, "System32", "cmd.exe");
  env.PATHEXT ??= ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC";
  env.TMP ??= env.TEMP ?? join(env.LOCALAPPDATA, "Temp");
  env.TEMP ??= env.TMP;
  return env;
}

/** Tiny semaphore so detail fetches/refreshes don't stampede winget. */
let activeQueries = 0;
const queryQueue: Array<() => void> = [];

async function withQuerySlot<T>(fn: () => Promise<T>): Promise<T> {
  // Loop, don't assume: a woken waiter must re-check the limit (several
  // waiters can be woken across releases that interleave with new arrivals).
  while (activeQueries >= QUERY_CONCURRENCY) {
    await new Promise<void>((resolve) => queryQueue.push(resolve));
  }
  activeQueries++;
  try {
    return await fn();
  } finally {
    activeQueries--;
    queryQueue.shift()?.();
  }
}

/** Run winget and collect output. See SpawnWingetOptions for behavior switches. */
async function runWinget(args: string[], options: SpawnWingetOptions = {}): Promise<ExecutorResult> {
  if (options.signal?.aborted) {
    throw new CancelledError();
  }

  const child = spawn(wingetExecutable(), args, {
    windowsHide: true,
    env: repairedChildEnv(),
  });

  return new Promise<ExecutorResult>((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const stdoutDecoder = new StringDecoder("utf-8");
    const stderrDecoder = new StringDecoder("utf-8");
    let settled = false;
    let killedByUs: "abort" | "timeout" | "stale" | null = null;
    let lastActivity = Date.now();
    let timeoutId: NodeJS.Timeout | undefined;
    let staleCheckId: NodeJS.Timeout | undefined;
    let abortHandler: (() => void) | undefined;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (staleCheckId) clearInterval(staleCheckId);
      if (abortHandler) options.signal?.removeEventListener("abort", abortHandler);
    };
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    child.once("spawn", () => {
      if (typeof child.pid === "number") {
        options.onSpawn?.(child.pid);
      }
    });

    if (options.signal) {
      abortHandler = () => {
        killedByUs = "abort";
        child.kill();
      };
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (killedByUs) {
          return; // an abort is already in flight; don't reclassify it
        }
        killedByUs = "timeout";
        child.kill();
        settle(() => reject(new Error(`WinGet command timed out after ${options.timeout}ms`)));
      }, options.timeout);
    }

    if (options.staleWatchdog) {
      staleCheckId = setInterval(() => {
        if (Date.now() - lastActivity > STALE_PROCESS_TIMEOUT_MS) {
          killedByUs = "stale";
          child.kill();
          settle(() =>
            reject(
              new StaleProcessError(
                `winget produced no output for ${STALE_PROCESS_TIMEOUT_MS / 60_000} minutes and was stopped. The installer may be waiting for input in a background window`,
              ),
            ),
          );
        }
      }, STALE_CHECK_INTERVAL_MS);
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      lastActivity = Date.now();
      stdoutChunks.push(chunk);
      options.onStdout?.(stdoutDecoder.write(chunk));
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      lastActivity = Date.now();
      stderrChunks.push(chunk);
      options.onStderr?.(stderrDecoder.write(chunk));
    });

    child.on("close", (code) => {
      if (killedByUs === "abort" || options.signal?.aborted) {
        settle(() => reject(new CancelledError()));
        return;
      }
      if (killedByUs === "timeout" || killedByUs === "stale") {
        return; // already rejected
      }
      settle(() =>
        resolve({
          stdout: filterLoadingAnimation(Buffer.concat(stdoutChunks).toString("utf-8")),
          stderr: Buffer.concat(stderrChunks).toString("utf-8"),
          exitCode: code ?? 1,
        }),
      );
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        settle(() => reject(new WingetNotFoundError(wingetExecutable())));
        return;
      }
      settle(() => reject(error));
    });
  });
}

/**
 * Filter WinGet loading-animation noise from final output. Every rule here
 * corresponds to a real output artifact:
 * - spinner frames are CR-overwritten segments sharing a physical line with real
 *   content → keep the LAST non-empty `\r` segment of each line;
 * - leading `\` `/` `|` spinner frames glued before real text are stripped
 *   (`-` excluded: it starts real rows like separators);
 * - lines of only progress-bar block characters/spinner chars are dropped;
 * - table separator lines (20+ dashes) are protected;
 * - the "Updating all sources" preamble is dropped.
 */
function filterLoadingAnimation(output: string): string {
  const withCRHandled = output
    .split(/\r?\n/)
    .map((line) => {
      if (line.includes("\r")) {
        const parts = line.split("\r");
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          if (part && part.trim().length > 0) {
            return part;
          }
        }
        return parts[parts.length - 1] ?? "";
      }
      return line;
    })
    .join("\n");

  const lines = withCRHandled.split(/\n/);
  const filtered = lines
    .map((line) => {
      if (/^[\s]*-{20,}/.test(line)) {
        return line;
      }

      let cleaned = line;
      while (/^[\s]*[\\/|][\s]+/.test(cleaned)) {
        const match = cleaned.match(/^[\s]*[\\/|][\s]+/);
        if (match && match[0].length < cleaned.length) {
          cleaned = cleaned.slice(match[0].length);
        } else {
          break;
        }
      }
      return cleaned;
    })
    .filter((line) => {
      if (/^-+$/.test(line.trim())) {
        return true;
      }
      const withoutProgressChars = line.replace(/[█▒▐▌▞▝\s\\/|-]/g, "");
      if (withoutProgressChars.length === 0) {
        return false;
      }
      if (/^Updating all sources/i.test(line.trim())) {
        return false;
      }
      const withoutSpinnerAndSpace = line.replace(/[\s]/g, "");
      if (withoutSpinnerAndSpace.length <= 1 && /^[\\/\-|]?$/.test(withoutSpinnerAndSpace)) {
        return false;
      }
      return line.trim().length > 0;
    });
  return filtered.join("\n");
}

export { configureWingetPath, filterLoadingAnimation, repairedChildEnv, runWinget, withQuerySlot };
