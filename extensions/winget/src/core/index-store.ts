/**
 * The package index: a single versioned JSON envelope shared by all commands.
 *
 * Concurrency model:
 * - Every read-modify-write goes through one short-lived index-write lock, so
 *   `revision` is a true monotonic counter; views reload when it changes.
 * - `mutationEpoch` is bumped when a mutation acquires the global op-lock.
 *   Refreshers record the epoch when their winget queries START; a mutable
 *   commit whose epoch is stale aborts ("fenced"). This prevents pre-mutation
 *   snapshots from resurrecting rows a mutation just changed. Catalog commits
 *   need no fencing (catalog data is mutation-independent).
 * - `patchMutable` never touches `packages`; `commitCatalog` refuses
 *   suspicious shrinkage (a failed/truncated search must not destroy the index).
 *
 * Pure module: paths and clock injected; @raycast/api stays out.
 */

import {
  type WingetInstalledPackage,
  type WingetPinnedPackage,
  type WingetSearchPackage,
  type WingetUpgradePackage,
} from "../cli/types";

import { deleteFileQuiet, fileMtime, readJson, writeJsonAtomic } from "./files";
import { acquireLock, releaseLock, type LockEnvironment } from "./lock";

const SCHEMA_VERSION = 2;
/** A rebuild may not shrink the catalog below this fraction of the previous size. */
const SHRINK_GUARD_RATIO = 0.1;
/** How long acquirers spin on the index-write lock before giving up. */
const WRITE_LOCK_WAIT_MS = 15_000;
const WRITE_LOCK_RETRY_MS = 50;
/** Index writes are ms-scale; a crashed writer is reapable after this. */
const WRITE_LOCK_STALE_MS = 10_000;

interface MutableSlices {
  installed: WingetInstalledPackage[];
  upgradable: WingetUpgradePackage[];
  pinned: WingetPinnedPackage[];
}

interface PackageIndex extends MutableSlices {
  schemaVersion: typeof SCHEMA_VERSION;
  /** Monotonic write counter; views reload when it changes. */
  revision: number;
  /** Bumped when a mutation takes the op-lock; fences stale refresh snapshots. */
  mutationEpoch: number;
  /** When `packages` was last rebuilt (TTL applies to this). */
  builtAt: number | null;
  /** When the mutable slices were last refreshed from winget. */
  mutableAt: number | null;
  packages: WingetSearchPackage[];
}

interface IndexPaths {
  indexPath: string;
  writeLockPath: string;
}

const EMPTY_INDEX: PackageIndex = {
  schemaVersion: SCHEMA_VERSION,
  revision: 0,
  mutationEpoch: 0,
  builtAt: null,
  mutableAt: null,
  packages: [],
  installed: [],
  upgradable: [],
  pinned: [],
};

function sleepSync(ms: number): void {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, ms);
}

function loadIndex(paths: IndexPaths): PackageIndex | null {
  const data = readJson<PackageIndex>(paths.indexPath);
  if (!data || data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.packages)) {
    return null;
  }
  return data;
}

function indexMtime(paths: IndexPaths): number | null {
  return fileMtime(paths.indexPath);
}

/**
 * Run one read-modify-write of the index under the index-write lock.
 * `mutate` returns the next envelope (revision is stamped here) or null to
 * abort without writing.
 */
function withIndexWrite<T>(
  paths: IndexPaths,
  env: LockEnvironment,
  mutate: (current: PackageIndex) => { next: PackageIndex | null; result: T },
): T {
  const opId = `idx-${Math.random().toString(36).slice(2)}`;
  const deadline = env.now() + WRITE_LOCK_WAIT_MS;
  // Holds are ms-scale, so a dead writer should block others briefly, not for
  // the op-lock's 30 s staleness window.
  const lockEnv = { ...env, staleMs: WRITE_LOCK_STALE_MS };
  for (;;) {
    const acquired = acquireLock(paths.writeLockPath, { opId, kind: "index-write", title: "index write" }, lockEnv);
    if (acquired.status === "acquired") {
      break;
    }
    if (env.now() > deadline) {
      throw new Error("Timed out waiting for the index write lock");
    }
    sleepSync(WRITE_LOCK_RETRY_MS);
  }

  try {
    const current = loadIndex(paths) ?? EMPTY_INDEX;
    const { next, result } = mutate(current);
    if (next) {
      writeJsonAtomic(paths.indexPath, {
        ...next,
        schemaVersion: SCHEMA_VERSION,
        revision: current.revision + 1,
      });
    }
    return result;
  } finally {
    releaseLock(paths.writeLockPath, opId);
  }
}

/** Called when a mutation acquires the op-lock: fences in-flight refresh snapshots. */
function bumpMutationEpoch(paths: IndexPaths, env: LockEnvironment): number {
  return withIndexWrite(paths, env, (current) => ({
    next: { ...current, mutationEpoch: current.mutationEpoch + 1 },
    result: current.mutationEpoch + 1,
  }));
}

/** The epoch a refresher must record before starting its winget queries. */
function currentMutationEpoch(paths: IndexPaths): number {
  return loadIndex(paths)?.mutationEpoch ?? 0;
}

type CommitOutcome = "committed" | "fenced" | "rejected-shrink";

/**
 * Apply a surgical change to the mutable slices (post-operation optimistic
 * patches and authoritative refreshes). Never touches `packages`.
 */
function patchMutable(
  paths: IndexPaths,
  env: LockEnvironment,
  options: {
    /** Epoch when the source data was captured; omit for optimistic patches made under the op-lock. */
    startEpoch?: number;
    stampMutableAt?: boolean;
  },
  mutate: (slices: MutableSlices) => MutableSlices,
): CommitOutcome {
  return withIndexWrite(paths, env, (current) => {
    if (options.startEpoch !== undefined && current.mutationEpoch !== options.startEpoch) {
      return { next: null, result: "fenced" as const };
    }
    const slices = mutate({
      installed: current.installed,
      upgradable: current.upgradable,
      pinned: current.pinned,
    });
    return {
      next: {
        ...current,
        ...slices,
        mutableAt: options.stampMutableAt ? env.now() : current.mutableAt,
      },
      result: "committed" as const,
    };
  });
}

/** Commit only the catalog slice (stage 1 of the staged cold build). */
function commitCatalog(paths: IndexPaths, env: LockEnvironment, packages: WingetSearchPackage[]): CommitOutcome {
  return withIndexWrite(paths, env, (current) => {
    if (current.packages.length > 0 && packages.length < current.packages.length * SHRINK_GUARD_RATIO) {
      return { next: null, result: "rejected-shrink" as const };
    }
    return {
      next: { ...current, packages, builtAt: env.now() },
      result: "committed" as const,
    };
  });
}

function isCatalogFresh(index: PackageIndex | null, validityMs: number, now: number): boolean {
  return !!index && index.builtAt !== null && index.packages.length > 0 && now - index.builtAt < validityMs;
}

/** One-time migration from the legacy v1 cache file, which is then deleted. */
function migrateLegacyIndex(paths: IndexPaths, env: LockEnvironment, legacyPath: string): boolean {
  interface LegacyIndex {
    packages?: WingetSearchPackage[];
    installed?: WingetInstalledPackage[];
    upgradable?: WingetUpgradePackage[];
    pinned?: WingetPinnedPackage[];
    timestamp?: number | null;
  }
  const legacy = readJson<LegacyIndex>(legacyPath);
  if (!legacy || !Array.isArray(legacy.packages) || legacy.packages.length === 0) {
    deleteFileQuiet(legacyPath);
    return false;
  }
  const migrated = withIndexWrite(paths, env, (current) => {
    if (current.packages.length > 0) {
      return { next: null, result: false };
    }
    return {
      next: {
        ...current,
        packages: legacy.packages ?? [],
        installed: legacy.installed ?? [],
        upgradable: legacy.upgradable ?? [],
        pinned: legacy.pinned ?? [],
        builtAt: legacy.timestamp ?? null,
        mutableAt: legacy.timestamp ?? null,
      },
      result: true,
    };
  });
  deleteFileQuiet(legacyPath);
  return migrated;
}

export {
  bumpMutationEpoch,
  commitCatalog,
  currentMutationEpoch,
  EMPTY_INDEX,
  indexMtime,
  isCatalogFresh,
  loadIndex,
  migrateLegacyIndex,
  patchMutable,
  SCHEMA_VERSION,
  type CommitOutcome,
  type IndexPaths,
  type MutableSlices,
  type PackageIndex,
};
