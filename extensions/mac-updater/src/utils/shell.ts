import { execFile, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// Candidate brew paths in priority order:
//   - /opt/homebrew/bin/brew  → Apple Silicon (default since macOS 11)
//   - /usr/local/bin/brew     → Intel Macs (still common)
//   - ~/.homebrew/bin/brew    → user-local install (rare)
const BREW_CANDIDATES = [
  "/opt/homebrew/bin/brew",
  "/usr/local/bin/brew",
  `${process.env.HOME}/.homebrew/bin/brew`,
];

let brewPathCache: string | null | undefined; // undefined = not checked yet, null = checked + missing

/** Find a usable brew binary, or null if Homebrew isn't installed. Result is cached for the session. */
export function findBrew(): string | null {
  if (brewPathCache !== undefined) return brewPathCache;
  for (const p of BREW_CANDIDATES) {
    if (fs.existsSync(p)) {
      brewPathCache = p;
      return p;
    }
  }
  brewPathCache = null;
  return null;
}

/** Throws a meaningful error if brew is required but not installed. */
export function requireBrew(): string {
  const p = findBrew();
  if (!p)
    throw new Error(
      "Homebrew is not installed. Install from https://brew.sh first.",
    );
  return p;
}

/**
 * Default brew path for backward compatibility. New code should call findBrew()/requireBrew()
 * directly to handle the no-brew case. This export keeps existing call sites compiling
 * but will resolve to /opt/homebrew/bin/brew even on Intel — prefer the helpers.
 */
export const BREW = findBrew() ?? "/opt/homebrew/bin/brew";

const PATH_ENV =
  "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";

export async function run(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(cmd, args, {
    env: { ...process.env, PATH: PATH_ENV },
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function runShell(
  cmd: string,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(cmd, {
    env: { ...process.env, PATH: PATH_ENV },
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * Thrown when a runWithTimeout / runShellWithTimeout call exceeds its budget.
 * Carries any output captured before the kill, so callers that want to surface
 * partial progress in error toasts can.
 */
export class CommandTimeoutError extends Error {
  readonly stdout: string;
  readonly stderr: string;
  readonly timeoutMs: number;
  constructor(timeoutMs: number, stdout = "", stderr = "") {
    super(
      `Command timed out after ${Math.round(timeoutMs / 1000)}s. ` +
        `This usually means a sudo/password prompt was needed but no terminal ` +
        `was attached — retry with administrator privileges.`,
    );
    this.name = "CommandTimeoutError";
    this.stdout = stdout;
    this.stderr = stderr;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Like run() but kills the child if it doesn't finish within `timeoutMs`.
 * On timeout, throws CommandTimeoutError so callers can distinguish hangs
 * from regular non-zero-exit failures.
 *
 * Why this matters: brew/mas/installer subprocesses can spawn sudo internally
 * (pkg-based casks like google-drive, microsoft-teams). Without a TTY sudo
 * either fails fast OR — depending on version and -A askpass config — hangs
 * waiting forever. We want hangs to surface as errors we can recover from.
 */
export async function runWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs: number,
  extraEnv?: Record<string, string>,
): Promise<{ stdout: string; stderr: string }> {
  const child = execFile(cmd, args, {
    env: { ...process.env, PATH: PATH_ENV, ...extraEnv },
    maxBuffer: 10 * 1024 * 1024,
  });
  let outBuf = "";
  let errBuf = "";
  child.stdout?.on("data", (d) => (outBuf += d.toString()));
  child.stderr?.on("data", (d) => (errBuf += d.toString()));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      reject(new CommandTimeoutError(timeoutMs, outBuf, errBuf));
    }, timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: outBuf, stderr: errBuf });
      else {
        const err = new Error(
          `Command failed: ${cmd} ${args.join(" ")}\n${errBuf || outBuf}`,
        ) as Error & { stdout: string; stderr: string; code: number | null };
        err.stdout = outBuf;
        err.stderr = errBuf;
        err.code = code;
        reject(err);
      }
    });
  });
}

/**
 * Shell-string variant of runWithTimeout. Use only when you genuinely need
 * shell features (pipes, redirects). Prefer runWithTimeout for fixed argv.
 */
export async function runShellWithTimeout(
  cmd: string,
  timeoutMs: number,
  extraEnv?: Record<string, string>,
): Promise<{ stdout: string; stderr: string }> {
  const child = exec(cmd, {
    env: { ...process.env, PATH: PATH_ENV, ...extraEnv },
    maxBuffer: 10 * 1024 * 1024,
  });
  let outBuf = "";
  let errBuf = "";
  child.stdout?.on("data", (d) => (outBuf += d.toString()));
  child.stderr?.on("data", (d) => (errBuf += d.toString()));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      reject(new CommandTimeoutError(timeoutMs, outBuf, errBuf));
    }, timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: outBuf, stderr: errBuf });
      else {
        const err = new Error(
          `Command failed: ${cmd}\n${errBuf || outBuf}`,
        ) as Error & { stdout: string; stderr: string; code: number | null };
        err.stdout = outBuf;
        err.stderr = errBuf;
        err.code = code;
        reject(err);
      }
    });
  });
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd], {
      env: { ...process.env, PATH: PATH_ENV },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pull the real error message out of a Node child_process error.
 * Node wraps brew/mas/etc errors as "Command failed: <cmd>" and the actual
 * reason ends up in `.stderr` (or `.stdout` when commands write errors there).
 */
export function extractCmdError(e: unknown): string {
  const err = e as {
    stderr?: string | Buffer;
    stdout?: string | Buffer;
    message?: string;
  };
  const stderr = (err.stderr?.toString() ?? "").trim();
  const stdout = (err.stdout?.toString() ?? "").trim();
  // brew writes errors to stderr; if blank, fall back to stdout (when piped via 2>&1)
  // Then drop the noisy "Command failed:" prefix from the wrapper message.
  let raw = stderr || stdout || err.message || String(e);
  raw = raw.replace(/^Command failed:[^\n]*\n?/, "").trim();
  // brew error messages start with "Error: " — keep the prose but strip the prefix once
  return raw || "Unknown error";
}
