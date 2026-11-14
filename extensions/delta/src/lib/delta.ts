/** Everything that talks to the Delta app or runs its CLI. Pure parsing lives in `cli.ts`. */
import { Cache, getApplications } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildCreateThreadArgs,
  buildQueryArgs,
  DeltaError,
  findThreadId,
  ModelUsage,
  ModelUseScanner,
  parseQueryResult,
  parseSignedIn,
  parseUpdateCheck,
  rankModels,
  toDeltaError,
  withJsonFlag,
} from "./cli";
import { demoThreadData, isDemoMode, runDemoCommand } from "./demo";
import { DeltaUpdateCheck, Organization, QueryResult, Thread, ThreadSummary, Visibility } from "./types";

const DELTA_BUNDLE_ID = "com.zed-industries.delta";
export const DELTA_DOWNLOAD_URL = "https://delta.dev/download";

/** How long each kind of CLI call may take before it's treated as stuck. */
const TIMEOUT = {
  /** Local reads: thread list, search, organizations, opening the app. */
  local: 15_000,
  /** Calls that reach Delta's servers or read a whole thread. */
  network: 60_000,
  /** Forking copies the thread's worktrees. */
  fork: 120_000,
  /** A model reads up to five transcripts before answering. */
  answer: 180_000,
  /** Downloading and installing a release. */
  install: 10 * 60_000,
} as const;

const cache = new Cache();
const CLI_PATH_CACHE_KEY = "delta-cli-path";

/**
 * The CLI path found on an earlier launch, if it's still there. Looking up installed apps takes
 * long enough to delay a command's first frame, so it only happens when this comes back empty.
 */
function getRememberedCliPath(): string | undefined {
  const path = cache.get(CLI_PATH_CACHE_KEY);
  return path && existsSync(path) ? path : undefined;
}

let cliLookup: Promise<string | undefined> | undefined;

/** The CLI ships inside the app bundle, found by bundle ID, so we never depend on the user's PATH. */
async function lookUpCliPath(): Promise<string | undefined> {
  const applications = await getApplications();
  const app = applications.find((candidate) => candidate.bundleId === DELTA_BUNDLE_ID);
  const path = app ? join(app.path, "Contents", "MacOS", "delta") : undefined;
  if (!path || !existsSync(path)) {
    cache.remove(CLI_PATH_CACHE_KEY);
    return undefined;
  }
  cache.set(CLI_PATH_CACHE_KEY, path);
  return path;
}

/** Path of the `delta` CLI inside Delta.app, or undefined when Delta isn't installed. */
export function findDeltaCli(): Promise<string | undefined> {
  const remembered = getRememberedCliPath();
  if (remembered) {
    return Promise.resolve(remembered);
  }
  // One lookup per command launch, shared by everything that starts at once.
  cliLookup ??= lookUpCliPath().finally(() => {
    cliLookup = undefined;
  });
  return cliLookup;
}

/** True when Delta is known to be installed without having to look. */
export function isDeltaRemembered(): boolean {
  return getRememberedCliPath() !== undefined;
}

async function getDeltaCliPath(): Promise<string> {
  const cliPath = await findDeltaCli();
  if (!cliPath) {
    throw new DeltaError("not-installed");
  }
  return cliPath;
}

/** Undefined when Delta can't say, in which case nobody should be told to sign in. */
function isSignedIn(cliPath: string): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    execFile(cliPath, ["auth", "status", "--json"], { timeout: 5_000 }, (error, stdout) => {
      resolve(error ? undefined : parseSignedIn(stdout));
    });
  });
}

/**
 * Explains a failed call. Delta's own message for a signed-out account differs by command, so
 * the account is checked here, and only after a failure: successful calls pay nothing for it.
 */
async function explainFailure(cliPath: string, stderr: string, fallback: string): Promise<DeltaError> {
  if ((await isSignedIn(cliPath)) === false) {
    return new DeltaError("not-signed-in");
  }
  return toDeltaError(stderr, fallback);
}

interface RunOptions {
  timeout?: number;
}

async function runDelta(args: string[], options: RunOptions = {}): Promise<string> {
  if (isDemoMode()) {
    return runDemoCommand(args);
  }
  const cliPath = await getDeltaCliPath();
  return new Promise((resolve, reject) => {
    execFile(
      cliPath,
      args,
      { timeout: options.timeout ?? TIMEOUT.local, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
        } else if (error.killed) {
          reject(new DeltaError("timeout"));
        } else {
          explainFailure(cliPath, stderr, error.message).then(reject);
        }
      },
    );
  });
}

async function runDeltaJson<T>(args: string[], options?: RunOptions): Promise<T> {
  const stdout = await runDelta(withJsonFlag(args), options);
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new DeltaError("unexpected-output");
  }
}

export function listThreads(): Promise<Thread[]> {
  return runDeltaJson<Thread[]>(["thread", "list"]);
}

/**
 * Delta's own thread search: titles, summaries and keywords first, then messages when nothing
 * matches. `keywordGroup` uses `|` between alternatives, as `buildKeywordGroup` builds it.
 */
export function searchThreads(keywordGroup: string, limit: number): Promise<Omit<Thread, "join_id" | "status">[]> {
  return runDeltaJson(["thread", "search", "--limit", String(limit), "--", keywordGroup]);
}

/** Compact transcript and metadata of one thread. */
export async function getThreadSummary(threadId: string): Promise<ThreadSummary> {
  const result = await runDeltaJson<ThreadSummary[]>(["thread", "show", "--format", "summarize", "--", threadId], {
    timeout: TIMEOUT.network,
  });
  if (!result[0]) {
    throw new DeltaError("thread-not-found");
  }
  return result[0];
}

export async function listOrganizations(): Promise<Organization[]> {
  const result = await runDeltaJson<{ organizations?: Organization[] }>(["org", "list"]);
  return result.organizations ?? [];
}

export async function setThreadArchived(thread: Pick<Thread, "id">, archived: boolean): Promise<void> {
  await runDelta(["thread", archived ? "archive" : "unarchive", thread.id], { timeout: TIMEOUT.network });
}

export async function shareThreadWithOrganization(thread: Pick<Thread, "id">): Promise<void> {
  await runDelta(["thread", "share", thread.id, "--visibility", "organization"], { timeout: TIMEOUT.network });
}

/** Makes a shared thread private again; people invited by email keep access. */
export async function unshareThread(thread: Pick<Thread, "id">): Promise<void> {
  await runDelta(["thread", "unshare", thread.id], { timeout: TIMEOUT.network });
}

/** Invites people by email; a thread that was never uploaded is uploaded privately first. */
export async function inviteToThread(thread: Pick<Thread, "id">, emails: string[]): Promise<void> {
  await runDelta(["thread", "invite", thread.id, ...emails], { timeout: TIMEOUT.network });
}

/** Forks the thread and its worktrees into a new local thread and returns the fork's ID, if Delta reports it. */
export async function forkThread(thread: Pick<Thread, "id">): Promise<string | undefined> {
  const result = await runDeltaJson<unknown>(["thread", "fork", thread.id], { timeout: TIMEOUT.fork });
  return findThreadId(result);
}

/** Deletes the thread's local data and its Cloud Runner. Irreversible. */
export async function deleteThread(thread: Pick<Thread, "id">): Promise<void> {
  await runDelta(["thread", "delete", thread.id, "--force"], { timeout: TIMEOUT.network });
}

/** Creates a thread with an unsent prompt and returns its ID. */
export async function createThread(options: {
  prompt: string;
  organizationId?: string;
  visibility: Visibility;
}): Promise<string> {
  const result = await runDeltaJson<unknown>(buildCreateThreadArgs(options), { timeout: TIMEOUT.network });
  const threadId = findThreadId(result);
  if (!threadId) {
    throw new DeltaError("other", "Delta created the thread but didn't return its ID");
  }
  return threadId;
}

/** Opens a path or Delta link in the app, or just activates it. */
export async function openInDelta(target?: string): Promise<void> {
  await runDelta(target ? ["open", target] : ["open"]);
}

/**
 * Answers a question with a model on the user's Delta account: from the given thread or threads when
 * `threadId` is set, otherwise from the threads that mention the question's keywords.
 */
export async function askDelta(
  question: string,
  options: { threadId?: string | string[]; model?: string } = {},
): Promise<QueryResult> {
  const stdout = await runDelta(buildQueryArgs(question, options), { timeout: TIMEOUT.answer });
  return parseQueryResult(stdout);
}

/**
 * Runs the CLI and hands its stdout to `onChunk` piece by piece instead of buffering it, for
 * output too large to hold in the command's 100 MB heap. Aborting `signal` stops the CLI.
 */
async function streamDelta(
  args: string[],
  onChunk: (chunk: string) => void,
  options: RunOptions & { signal?: AbortSignal } = {},
): Promise<void> {
  if (isDemoMode()) {
    onChunk(demoThreadData(args.at(-1) ?? ""));
    return;
  }
  const cliPath = await getDeltaCliPath();
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, { stdio: ["ignore", "pipe", "pipe"], signal: options.signal });
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeout ?? TIMEOUT.local);

    // utf8 decoding on the stream keeps multi-byte characters intact across chunk boundaries.
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", onChunk);
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-4096);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new DeltaError("timeout"));
      } else if (code === 0) {
        resolve();
      } else {
        reject(toDeltaError(stderr, `Delta exited with code ${code}`));
      }
    });
  });
}

/**
 * Models that answered in the given threads, most used first. Delta has no command that lists the
 * models an account can use, so this reads them from threads with the undocumented
 * `--debug thread data` command. Threads it can't read are skipped; if the command disappears in a
 * future Delta release, the result is simply empty.
 */
export async function listModelsUsedInThreads(threadIds: string[], signal?: AbortSignal): Promise<ModelUsage[]> {
  const counts = new Map<string, number>();
  // One thread at a time, streamed: each thread's data tree is tens of megabytes.
  for (const threadId of threadIds) {
    signal?.throwIfAborted();
    const scanner = new ModelUseScanner();
    try {
      await streamDelta(["--debug", "thread", "data", threadId], (chunk) => scanner.push(chunk), {
        timeout: TIMEOUT.network,
        signal,
      });
    } catch (error) {
      if (error instanceof DeltaError && error.kind === "not-installed") {
        throw error;
      }
      continue; // Skip unreadable threads, including partial output from a failed read.
    }
    for (const [id, uses] of scanner.counts) {
      counts.set(id, (counts.get(id) ?? 0) + uses);
    }
  }
  return rankModels(counts);
}

/** Asks Delta's release server whether a newer version exists; never downloads anything. */
export async function checkForDeltaUpdate(): Promise<DeltaUpdateCheck | undefined> {
  return parseUpdateCheck(await runDelta(["update", "--check", "--json"], { timeout: TIMEOUT.network }));
}

/** Downloads and installs the update; a running Delta app restarts to finish it. */
export async function installDeltaUpdate(): Promise<void> {
  await runDelta(["update"], { timeout: TIMEOUT.install });
}
