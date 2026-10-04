import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

// Raycast command workers get a minimal environment (no USER/LANG, PATH depends on how
// Raycast was launched). Every CLI is called by absolute path with this explicit env.
export function childEnv(): NodeJS.ProcessEnv {
  const home = os.homedir();
  let user = process.env.USER;
  try {
    user = user || os.userInfo().username;
  } catch {
    // userInfo can throw in sandboxed contexts; leave USER unset
  }
  const env: NodeJS.ProcessEnv = {
    HOME: home,
    PATH: [
      "/opt/homebrew/bin",
      path.join(home, ".local/bin"),
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
    ].join(":"),
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
  };
  if (user) {
    env.USER = user;
    env.LOGNAME = user;
  }
  if (process.env.TMPDIR) env.TMPDIR = process.env.TMPDIR;
  return env;
}

/** Expand a leading "~" and require an absolute path afterwards. */
export function resolveExecutable(p: string): string {
  const trimmed = p.trim();
  const expanded = trimmed === "~" || trimmed.startsWith("~/") ? path.join(os.homedir(), trimmed.slice(1)) : trimmed;
  if (!path.isAbsolute(expanded)) throw new Error(`Executable path must be absolute: ${trimmed}`);
  return expanded;
}

export interface RunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  /** true when the query policy killed the process at its deadline. */
  timedOut: boolean;
  /** true when output beyond the retention cap was dropped (process kept running). */
  truncated: boolean;
}

export class ExecError extends Error {
  constructor(
    message: string,
    readonly code: "ENOENT" | "EACCES" | "SPAWN" = "SPAWN",
  ) {
    super(message);
  }
}

interface RunOptions {
  /** Kill after this many ms (query policy only). */
  timeoutMs?: number;
  /** Keep at most this many bytes of each stream; excess is drained and dropped, never kills the child. */
  maxBytes?: number;
  stdin?: "ignore";
  onSpawn?: (pid: number | undefined) => void;
}

function run(file: string, args: readonly string[], opts: RunOptions): Promise<RunResult> {
  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(file, [...args], { env: childEnv(), stdio: ["ignore", "pipe", "pipe"], shell: false });
    } catch (error) {
      reject(new ExecError(`Could not start ${path.basename(file)}: ${String(error)}`));
      return;
    }
    opts.onSpawn?.(child.pid);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let outBytes = 0;
    let errBytes = 0;
    let truncated = false;
    let timedOut = false;
    child.stdout.on("data", (chunk: Buffer) => {
      if (outBytes < maxBytes) {
        out.push(chunk);
        outBytes += chunk.length;
      } else truncated = true;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (errBytes < maxBytes) {
        err.push(chunk);
        errBytes += chunk.length;
      } else truncated = true;
    });
    let timer: NodeJS.Timeout | undefined;
    if (opts.timeoutMs) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 2000).unref();
      }, opts.timeoutMs);
    }
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (timer) clearTimeout(timer);
      const name = path.basename(file);
      if (error.code === "ENOENT") reject(new ExecError(`${name} not found at ${file}`, "ENOENT"));
      else if (error.code === "EACCES") reject(new ExecError(`${name} is not executable: ${file}`, "EACCES"));
      else reject(new ExecError(`${name} failed to start: ${error.message}`));
    });
    child.on("close", (exitCode, signal) => {
      if (timer) clearTimeout(timer);
      resolve({
        exitCode,
        signal,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
        timedOut,
        truncated,
      });
    });
  });
}

/** Query policy: bounded runtime. Use for usage/status reads only. */
export function runQuery(file: string, args: readonly string[], timeoutMs = 30_000): Promise<RunResult> {
  return run(file, args, { timeoutMs });
}

export class DeadlineError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Query that may have side effects the backend must be allowed to finish (e.g. cswap --list can rotate refresh
 * tokens and write the keychain). At the deadline the caller stops waiting (DeadlineError) but the child is never
 * signalled; it keeps running detached with its output drained and discarded. `onSpawn` gets the child's pid, so a
 * caller holding a lock can keep it until a detached child exits (no second run starts over a running one).
 */
export function runQueryNoKill(
  file: string,
  args: readonly string[],
  deadlineMs: number,
  onSpawn?: (pid: number | undefined) => void,
): Promise<RunResult> {
  const child = run(file, args, { maxBytes: 10 * 1024 * 1024, onSpawn });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new DeadlineError(`${path.basename(file)} is still running after ${Math.round(deadlineMs / 1000)} s`)),
      deadlineMs,
    );
    child.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Mutation policy: the extension never kills the child (no timeout, output overflow is drained and dropped).
 * Callers that need a UI deadline should race the returned promise and report "still running / unknown",
 * never "failed".
 */
export function runMutation(
  file: string,
  args: readonly string[],
  onSpawn?: (pid: number | undefined) => void,
): Promise<RunResult> {
  return run(file, args, { maxBytes: 1024 * 1024, onSpawn });
}

/**
 * Strict JSON parsing with one narrow compatibility rule: when the whole output is not JSON,
 * accept the LAST line that parses as a JSON object/array on its own (claude-swap 0.26 can print a
 * warning line before its JSON). Everything else is an error.
 */
export function parseJsonOutput(stdout: string): unknown {
  const text = stdout.trim();
  if (!text) throw new Error("empty output");
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split(/\r?\n/).reverse();
    for (const line of lines) {
      const candidate = line.trim();
      if (!(candidate.startsWith("{") || candidate.startsWith("["))) continue;
      try {
        return JSON.parse(candidate);
      } catch {
        // keep looking
      }
    }
    // Multi-line pretty JSON preceded by noise: find a line that is exactly "{" or "[" and parse from there.
    const all = text.split(/\r?\n/);
    for (let i = 0; i < all.length; i++) {
      const t = all[i].trim();
      if (t === "{" || t === "[") {
        try {
          return JSON.parse(all.slice(i).join("\n"));
        } catch {
          break;
        }
      }
    }
    throw new Error("output is not valid JSON");
  }
}

/** Strip control characters and cap length so backend text is safe to cache and display. */
export function sanitize(value: unknown, max = 240): string {
  return (
    String(value ?? "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
  );
}
