import path from "node:path";
import { parseLines, toRepositories, type GhqExecutor, type Repository } from "./ghq";

/** What to clone with `ghq get`. */
export type GetOptions = {
  /** Anything `ghq get` accepts: an https URL, an scp-like SSH address, `owner/repo` or a bare name. */
  repository: string;
  /** Clone over SSH (`ghq get -p`). */
  ssh: boolean;
};

/** Builds the arguments of `ghq get`; the `--` terminator keeps input that starts with a dash from being read as a flag. */
export function buildGetArgs(options: GetOptions): string[] {
  return options.ssh ? ["get", "-p", "--", options.repository] : ["get", "--", options.repository];
}

/** Builds the arguments of the `ghq list` lookup that prints the absolute paths matching the same input as `ghq get`. */
export function buildExactListArgs(repository: string): string[] {
  return ["list", "--full-path", "--exact", "--", repository];
}

/** Returns the entries of `after` that are not in `before`, preserving order and dropping duplicates. */
export function diffNewPaths(before: string[], after: string[]): string[] {
  const known = new Set(before);
  const fresh: string[] = [];

  for (const entry of after) {
    if (!known.has(entry)) {
      known.add(entry);
      fresh.push(entry);
    }
  }
  return fresh;
}

const URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:?#]*)(?::\d*)?([^?#]*)/i;
const SCP_PATTERN = /^(?:[^@/]+@)?([^:/]+):(.+)$/;

/** Reduces `ghq get` input to the lower-cased path its clone ends with, e.g. `github.com/owner/repo`. */
function toPathSuffix(repository: string): string {
  const url = URL_PATTERN.exec(repository);
  const scp = url ? null : SCP_PATTERN.exec(repository);
  const location = url ? `${url[1]}/${url[2]}` : scp ? `${scp[1]}/${scp[2]}` : repository;
  const segments = location.split("/").filter((segment) => segment.length > 0);
  return segments
    .join("/")
    .replace(/\.git$/i, "")
    .toLowerCase();
}

/** Returns the paths that end with the location `ghq get` derives from the input, compared case-insensitively. */
export function matchPathsIgnoringCase(fullPaths: string[], repository: string): string[] {
  const suffix = toPathSuffix(repository);
  return suffix.length === 0 ? [] : fullPaths.filter((fullPath) => fullPath.toLowerCase().endsWith(`/${suffix}`));
}

// Built from the character code so the source has no control character in a regex literal (eslint no-control-regex).
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, "g");

/** Removes ANSI escape sequences such as the colour codes ghq puts around its log labels. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

const GENERIC_SSH_FATAL = "Could not read from remote repository.";
// OpenSSH chatter that precedes a failure without being its cause: known_hosts additions, key exchange warnings.
const SSH_NOTICE_PATTERN = /^(?:Warning: |\*\* )/;
const SUBMODULE_FATAL_PATTERN = /^fatal: clone of '(.+?)' into submodule path/;

/**
 * Over SSH every failure ends in the same fatal line; what went wrong is what the server or ssh said between the last
 * `Cloning into` and that line: `ERROR: Repository not found.`, `Permission denied (publickey).`, GitLab's framed text.
 */
function findSshCause(lines: string[], fatalIndex: number): string | undefined {
  const start = lines.slice(0, fatalIndex).findLastIndex((line) => line.startsWith("Cloning into")) + 1;
  const candidates = lines
    .slice(start, fatalIndex)
    .map((line) => line.replace(/^remote:\s*/, ""))
    .filter((line) => /[A-Za-z0-9]/.test(line) && !SSH_NOTICE_PATTERN.test(line));

  // A message that spans several lines starts with `ERROR:`; otherwise the cause is the last thing said.
  const cause = (candidates.find((line) => line.startsWith("ERROR:")) ?? candidates.at(-1))?.replace(/^ERROR:\s*/, "");
  if (cause === undefined) {
    return undefined;
  }
  // `ghq get` clones recursively: say so when it is a submodule, not the requested repository, that cannot be read.
  const submodule = lines
    .slice(fatalIndex)
    .map((line) => SUBMODULE_FATAL_PATTERN.exec(line))
    .find((match) => match !== null);
  return submodule ? `${cause} (submodule ${submodule[1]})` : cause;
}

/** Condenses the stderr of a failed `ghq get` into a one-line message. */
export function summarizeGhqError(stderr: string): string {
  // git progress output separates its updates with a bare CR.
  const lines = stripAnsi(stderr)
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fatalIndex = lines.findIndex((line) => line.startsWith("fatal:"));
  if (fatalIndex !== -1) {
    const fatal = lines[fatalIndex].slice("fatal:".length).trim();
    return (fatal === GENERIC_SSH_FATAL ? findSshCause(lines, fatalIndex) : undefined) ?? fatal;
  }

  // ghq's own log line reads `error <message>` once the colour codes are gone.
  const error = lines.map((line) => /^error\s+(.*)$/.exec(line)).findLast((match) => match !== null);
  if (error) {
    return error[1];
  }

  return lines.at(-1) ?? "Unknown error";
}

/** Thrown when `ghq get` exits with a non-zero code. */
export class GhqError extends Error {
  /** Raw stderr of the process, ANSI escape sequences included. */
  readonly stderr: string;

  constructor(message: string, stderr: string) {
    super(message);
    this.name = "GhqError";
    this.stderr = stderr;
  }
}

/** Thrown when `ghq get` is aborted through its signal. */
export class GhqCancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "GhqCancelledError";
  }
}

/** Runs `ghq get` with the given arguments and resolves once it has finished successfully. */
export type GhqGetExecutor = (args: string[], options?: { signal?: AbortSignal }) => Promise<void>;

/**
 * Outcome of {@link getRepository}: the repositories that were cloned, or the ones that already existed.
 * `unknown` means the exact lookup found nothing or failed; its repositories, if any, come from a case-insensitive match.
 */
export type GetResult = { status: "cloned" | "exists" | "unknown"; repositories: Repository[] };

/**
 * Clones a repository with `ghq get` and reports what it produced.
 * ghq tells new from existing only on stderr, so the exact lookup is compared before and after instead.
 */
export async function getRepository(
  exec: { list: GhqExecutor; get: GhqGetExecutor },
  options: GetOptions,
  signal?: AbortSignal,
): Promise<GetResult> {
  const lookupArgs = buildExactListArgs(options.repository);
  const before = parseLines(await exec.list(lookupArgs));

  await exec.get(buildGetArgs(options), { signal });

  try {
    return await describeOutcome(exec.list, options.repository, before);
  } catch {
    // `ghq get` succeeded, so the repository is there: failing to look it up must not be reported as a failed clone.
    return { status: "unknown", repositories: [] };
  }
}

/** Tells what a finished `ghq get` produced by repeating the exact lookup that gave `before`. */
async function describeOutcome(list: GhqExecutor, repository: string, before: string[]): Promise<GetResult> {
  const [rootsOutput, afterOutput] = await Promise.all([list(["root", "--all"]), list(buildExactListArgs(repository))]);
  const roots = parseLines(rootsOutput);
  const after = parseLines(afterOutput);
  const fresh = diffNewPaths(before, after);

  if (after.length === 0) {
    // The exact lookup is case-sensitive, GitHub and most file systems are not: `Owner/Repo` may live in `owner/repo`.
    const all = parseLines(await list(["list", "--full-path"]));
    return { status: "unknown", repositories: toRepositories(roots, matchPathsIgnoringCase(all, repository)) };
  }
  if (fresh.length === 0) {
    return { status: "exists", repositories: toRepositories(roots, after) };
  }
  return { status: "cloned", repositories: toRepositories(roots, fresh) };
}

const SYSTEM_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
const PACKAGE_MANAGER_DIRECTORIES = ["/opt/homebrew/bin", "/usr/local/bin"];

/**
 * Builds the environment of `ghq get`: git never prompts on a terminal that is not there, and what git may need next to
 * itself (git-lfs, a credential helper) can be found even though Raycast only passes the system directories as PATH.
 * Directories are appended, never prepended, so every command that is already found stays the one that runs.
 */
export function buildGetEnv(env: NodeJS.ProcessEnv, binary: string): NodeJS.ProcessEnv {
  const directories = (env.PATH || SYSTEM_PATH).split(":");
  // A relative directory on PATH would resolve against whatever the working directory happens to be.
  const binaryDirectory = path.isAbsolute(binary) ? [path.dirname(binary)] : [];
  for (const directory of [...binaryDirectory, ...PACKAGE_MANAGER_DIRECTORIES]) {
    if (!directories.includes(directory)) {
      directories.push(directory);
    }
  }
  return { ...env, GIT_TERMINAL_PROMPT: "0", PATH: directories.join(":") };
}

/** Keeps at most the last `limit` UTF-16 code units of `text`, never starting inside a surrogate pair. */
export function keepEnd(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  const end = text.slice(-limit);
  const first = end.charCodeAt(0);
  return first >= 0xdc00 && first <= 0xdfff ? end.slice(1) : end;
}

const MAX_STDERR_LENGTH = 1024 * 1024;
const STDERR_GRACE_MS = 500;
const KILL_GRACE_MS = 5000;

/** Creates a {@link GhqGetExecutor} bound to an absolute path of the ghq binary. */
export function createGhqGetExecutor(binary: string): GhqGetExecutor {
  return async (args, options) => {
    const { spawn } = await import("node:child_process");
    const signal = options?.signal;
    if (signal?.aborted) {
      throw new GhqCancelledError();
    }

    return new Promise<void>((resolve, reject) => {
      // No timeout: a clone can take arbitrarily long, the user cancels instead.
      const child = spawn(binary, args, {
        detached: true,
        stdio: ["ignore", "ignore", "pipe"],
        env: buildGetEnv(process.env, binary),
      });
      let stderr = "";
      let cancelled = false;
      let settled = false;
      let graceTimer: ReturnType<typeof setTimeout> | undefined;
      let killTimer: ReturnType<typeof setTimeout> | undefined;

      // Signals the whole process group: killing ghq alone leaves `git clone` running as an orphan.
      const killGroup = (killSignal: NodeJS.Signals) => {
        try {
          if (child.pid !== undefined) {
            process.kill(-child.pid, killSignal);
          }
        } catch {
          child.kill(killSignal);
        }
      };
      const onAbort = () => {
        cancelled = true;
        killGroup("SIGTERM");
        // A group that ignores SIGTERM would leave the form waiting forever.
        killTimer = setTimeout(() => killGroup("SIGKILL"), KILL_GRACE_MS);
      };
      const settle = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(graceTimer);
        clearTimeout(killTimer);
        signal?.removeEventListener("abort", onAbort);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const finish = (code: number | null, killSignal: NodeJS.Signals | null) => {
        if (code === 0) {
          // Also when Cancel came too late to stop it: the clone is complete, so it is reported as such.
          settle();
        } else if (cancelled) {
          settle(new GhqCancelledError());
        } else {
          const output = keepEnd(stderr, MAX_STDERR_LENGTH);
          const message = code === null ? `ghq was terminated by ${killSignal}` : summarizeGhqError(output);
          settle(new GhqError(message, output));
        }
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
        // Trimming copies the whole text and git reports its progress in many small chunks: trimming only once the
        // text has doubled keeps a chunk O(its size) on average instead of O(limit).
        if (stderr.length > 2 * MAX_STDERR_LENGTH) {
          stderr = keepEnd(stderr, MAX_STDERR_LENGTH);
        }
      });
      child.on("error", (error) => settle(error));
      child.on("close", finish);
      // `close` waits for the end of stderr, which a process that outlives ghq (a hook's background job, an SSH master)
      // can hold open indefinitely: once ghq has exited, the rest of its output only gets a short grace period.
      child.on("exit", (code, killSignal) => {
        graceTimer = setTimeout(() => {
          child.stderr.destroy();
          finish(code, killSignal);
        }, STDERR_GRACE_MS);
      });
    });
  };
}
