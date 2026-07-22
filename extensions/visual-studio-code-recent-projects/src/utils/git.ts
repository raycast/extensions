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
const branchLookups = new Map<string, { expiresAt: number; promise: Promise<string | null> }>();
let activeBranchLookups = 0;
const queuedBranchLookups: (() => void)[] = [];

async function withBranchLookupSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeBranchLookups >= MAX_CONCURRENT_BRANCH_LOOKUPS) {
    await new Promise<void>((resolve) => queuedBranchLookups.push(resolve));
  }

  activeBranchLookups += 1;

  try {
    return await operation();
  } finally {
    activeBranchLookups -= 1;
    queuedBranchLookups.shift()?.();
  }
}

export async function getGitBranch(directoryPath: string): Promise<string | null> {
  const now = Date.now();
  const cachedLookup = branchLookups.get(directoryPath);
  if (cachedLookup && cachedLookup.expiresAt > now) {
    return cachedLookup.promise;
  }

  pruneBranchLookupCache(now);
  const lookup = withBranchLookupSlot(() => getGitBranchUncached(directoryPath));
  branchLookups.set(directoryPath, { promise: lookup, expiresAt: now + BRANCH_LOOKUP_CACHE_TTL_MS });

  return lookup;
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

async function getGitBranchUncached(directoryPath: string): Promise<string | null> {
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
    });

    const branch = stdout.trim();
    return branch || null;
  } catch (error) {
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
