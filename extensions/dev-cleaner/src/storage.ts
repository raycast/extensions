import { LocalStorage } from "@raycast/api";
import { realpath } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { isPathInside } from "./lib/path-safety";
import type { CleanupCandidate, CleanupResult, CleanupRun, ExcludedItem } from "./types";

const PROJECT_ROOTS_KEY = "project-roots";
const CLEANUP_HISTORY_KEY = "cleanup-history";
const EXCLUDED_ITEMS_KEY = "excluded-items";
const MAX_HISTORY_RUNS = 25;

export async function normalizeProjectRoots(roots: string[]): Promise<string[]> {
  const canonical = await Promise.all(
    roots.map(async (root) => {
      try {
        return await realpath(root);
      } catch {
        return path.resolve(root);
      }
    }),
  );
  const unique = [...new Set(canonical)].sort((left, right) => left.length - right.length);
  return unique.filter((root, index) => !unique.slice(0, index).some((parent) => isPathInside(root, parent)));
}

export interface ProjectRootWarnings {
  /** A root is the filesystem root, which is never scanned. */
  filesystemRoot: boolean;
  /** A root is the home directory or one of its ancestors, so the whole home directory would be scanned. */
  coversHome: boolean;
}

/**
 * Checks normalized roots against the home directory canonicalized the same way, so a symlinked or firmlinked home
 * path still triggers the warning.
 */
export async function projectRootWarnings(
  normalizedRoots: string[],
  homeDirectory: string,
): Promise<ProjectRootWarnings> {
  const [canonicalHome] = await normalizeProjectRoots([homeDirectory]);
  return {
    filesystemRoot: normalizedRoots.some((root) => root === path.parse(root).root),
    coversHome: normalizedRoots.some((root) => root === canonicalHome || isPathInside(canonicalHome, root)),
  };
}

/** Returns `undefined` only when no roots were saved yet; unreadable or invalid saved roots throw instead. */
export async function readProjectRoots(): Promise<string[] | undefined> {
  const value = await LocalStorage.getItem<string>(PROJECT_ROOTS_KEY);
  if (value === undefined) return undefined;
  let roots: unknown;
  try {
    roots = JSON.parse(value);
  } catch {
    throw new Error("Saved project roots are invalid");
  }
  if (!Array.isArray(roots) || !roots.every((root) => typeof root === "string")) {
    throw new Error("Saved project roots are invalid");
  }
  return normalizeProjectRoots(roots);
}

export async function writeProjectRoots(roots: string[]): Promise<void> {
  await LocalStorage.setItem(PROJECT_ROOTS_KEY, JSON.stringify(await normalizeProjectRoots(roots)));
}

function isExcludedItem(value: unknown): value is ExcludedItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.title === "string" &&
    typeof item.subtitle === "string" &&
    typeof item.providerId === "string" &&
    typeof item.addedAt === "string" &&
    (item.path === undefined || typeof item.path === "string")
  );
}

export async function readExcludedItems(): Promise<ExcludedItem[]> {
  const value = await LocalStorage.getItem<string>(EXCLUDED_ITEMS_KEY);
  if (value === undefined) return [];
  let items: unknown;
  try {
    items = JSON.parse(value);
  } catch {
    throw new Error("Saved kept items are invalid");
  }
  if (!Array.isArray(items) || !items.every(isExcludedItem)) throw new Error("Saved kept items are invalid");
  return [...new Map(items.map((item) => [item.id, item] as const)).values()];
}

export async function writeExcludedItems(items: ExcludedItem[]): Promise<void> {
  await LocalStorage.setItem(EXCLUDED_ITEMS_KEY, JSON.stringify(items));
}

export async function readCleanupHistory(): Promise<CleanupRun[]> {
  try {
    const value = await LocalStorage.getItem<string>(CLEANUP_HISTORY_KEY);
    if (!value) return [];
    const history: unknown = JSON.parse(value);
    return Array.isArray(history) ? (history as CleanupRun[]) : [];
  } catch {
    return [];
  }
}

export async function recordCleanupRun(
  candidates: CleanupCandidate[],
  results: CleanupResult[],
  startedAt: Date,
  completedAt: Date,
): Promise<CleanupRun> {
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const run: CleanupRun = {
    id: `${startedAt.toISOString()}:${randomUUID()}`,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    items: results.map((result) => {
      const candidate = candidatesById.get(result.candidateId);
      return {
        ...result,
        title: candidate?.title ?? result.candidateId,
        providerId: candidate?.providerId ?? "projects",
        cleanupPolicy: candidate?.cleanupPolicy ?? "trash",
      };
    }),
  };
  const history = await readCleanupHistory();
  await LocalStorage.setItem(CLEANUP_HISTORY_KEY, JSON.stringify([run, ...history].slice(0, MAX_HISTORY_RUNS)));
  return run;
}
