import { showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const MAX_CONCURRENT_BRANCH_LOOKUPS = 4;
const BRANCH_LOOKUP_CACHE_TTL_MS = 15_000;
const MAX_CACHED_BRANCH_LOOKUPS = 100;
const branchLookups = new Map<string, { branch: string | null; expiresAt: number }>();
let activeBranchLookups = 0;
const queuedBranchLookups: { resolve: () => void; reject: (error: Error) => void; signal?: AbortSignal }[] = [];

async function withBranchLookupSlot<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  await waitForBranchLookupSlot(signal);

  try {
    if (signal?.aborted) {
      throw new Error("Git branch lookup aborted");
    }

    return await operation();
  } finally {
    releaseBranchLookupSlot();
  }
}

async function waitForBranchLookupSlot(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new Error("Git branch lookup aborted");
  }

  if (activeBranchLookups < MAX_CONCURRENT_BRANCH_LOOKUPS) {
    activeBranchLookups += 1;
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const queuedLookup = { resolve, reject, signal };
    queuedBranchLookups.push(queuedLookup);

    signal?.addEventListener(
      "abort",
      () => {
        const queuedLookupIndex = queuedBranchLookups.indexOf(queuedLookup);
        if (queuedLookupIndex >= 0) {
          queuedBranchLookups.splice(queuedLookupIndex, 1);
          reject(new Error("Git branch lookup aborted"));
        }
      },
      { once: true },
    );
  });
}

function releaseBranchLookupSlot() {
  const nextLookup = queuedBranchLookups.shift();

  if (nextLookup) {
    nextLookup.resolve();
    return;
  }

  activeBranchLookups -= 1;
}

export async function getGitBranch(directoryPath: string, signal?: AbortSignal): Promise<string | null> {
  const now = Date.now();
  const cachedLookup = branchLookups.get(directoryPath);
  if (cachedLookup && cachedLookup.expiresAt > now) {
    return cachedLookup.branch;
  }

  pruneBranchLookupCache(now);
  const branch = await withBranchLookupSlot(() => getGitBranchUncached(directoryPath, signal), signal);

  if (!signal?.aborted) {
    branchLookups.set(directoryPath, { branch, expiresAt: Date.now() + BRANCH_LOOKUP_CACHE_TTL_MS });
  }

  return branch;
}

function pruneBranchLookupCache(now: number) {
  for (const [path, lookup] of branchLookups) {
    if (lookup.expiresAt <= now) {
      branchLookups.delete(path);
    }
  }

  while (branchLookups.size >= MAX_CACHED_BRANCH_LOOKUPS) {
    const oldestPath = branchLookups.keys().next().value;
    if (!oldestPath) {
      return;
    }
    branchLookups.delete(oldestPath);
  }
}

async function getGitBranchUncached(directoryPath: string, signal?: AbortSignal): Promise<string | null> {
  try {
    // If it's a file URL, convert it to a file path
    if (directoryPath.startsWith("file://")) {
      directoryPath = fileURLToPath(directoryPath);
    }

    // If it's a file path, get its directory
    const stats = await fs.promises.stat(directoryPath);
    if (!stats.isDirectory()) {
      directoryPath = path.dirname(directoryPath);
    }

    // Check if .git directory exists
    const gitDir = path.join(directoryPath, ".git");
    const isGitRepo = await fs.promises
      .access(gitDir)
      .then(() => true)
      .catch(() => false);

    if (!isGitRepo) {
      return null;
    }

    // Run git command to get current branch
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directoryPath,
      encoding: "utf-8",
      signal,
    });

    const branch = stdout.trim();
    return branch || null;
  } catch (error) {
    if (signal?.aborted) {
      return null;
    }
    // Only show error if it's not the common "not a git repository" error and not the "ambiguous argument 'HEAD'" error
    if (
      error instanceof Error &&
      !error.message.includes("not a git repository") &&
      !error.message.includes("ambiguous argument 'HEAD'")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Git Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
