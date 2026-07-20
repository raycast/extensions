/**
 * Index refresh orchestration. The lock-guarded entry points run in view
 * workers; refreshSlicesIncrementally is the shared slice-commit mechanism
 * also used by the runner's post-operation refreshes.
 *
 * - Staged cold build: persist the catalog first (~5 s, verified safe from
 *   truncation) so Search becomes usable immediately, then fill the mutable
 *   slices. Installed/Upgradable only need the mutable stage.
 * - Mutable commits are epoch-fenced AND gate-checked at capture time: the
 *   epoch fences mutations that START after the snapshot; the gate check
 *   covers a mutation already IN FLIGHT when the snapshot starts (its epoch
 *   bump happened before our capture, so the fence alone cannot see it).
 * - Concurrent refreshes dedupe via the refresh lock. Losers WAIT: if the
 *   holder finishes, they re-check whether the work is still needed; if the
 *   holder died (view workers die on pop/back), acquireLock reaps the stale
 *   lock and the loser takes over — a killed cold build must not strand
 *   every other view in a silent dead zone.
 */

import { randomUUID } from "node:crypto";

import { listInstalledPackages, listPinnedPackages, listUpgradePackages, searchAllPackages } from "../cli/commands";
import { type WingetInstalledPackage, type WingetUpgradePackage } from "../cli/types";

import {
  commitCatalog,
  currentMutationEpoch,
  loadIndex,
  patchMutable,
  type IndexPaths,
  type MutableSlices,
} from "./index-store";
import { acquireLock, heartbeatLock, inspectLock, releaseLock, DEFAULT_ENV } from "./lock";
import { inspectOperationGate } from "./operations";
import { supportPath } from "./paths";

const REFRESH_HEARTBEAT_MS = 2_000;
/** Refresh-lock holders heartbeat every 2 s; a dead one is reapable after this. */
const REFRESH_STALE_MS = 15_000;
/** How long a loser waits on a live holder before giving up. */
const WAIT_FOR_HOLDER_MS = 180_000;
const WAIT_POLL_MS = 2_000;

type RefreshOutcome = "refreshed" | "refreshed-elsewhere" | "skipped-busy" | "skipped-concurrent" | "fenced" | "failed";

/** How stale the mutable slices may get before a view mount refreshes them. */
const MUTABLE_STALENESS_MS = 10 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` as the sole refresher. While another LIVE refresher holds the
 * lock, wait; when the lock frees (finished or reaped-after-death), re-check
 * `stillNeeded` — the other refresher may have already done the work.
 */
async function withRefreshLock(stillNeeded: () => boolean, fn: () => Promise<RefreshOutcome>): Promise<RefreshOutcome> {
  const lockPath = supportPath("refreshLock");
  const lockEnv = { ...DEFAULT_ENV, staleMs: REFRESH_STALE_MS };
  const opId = randomUUID();
  const deadline = Date.now() + WAIT_FOR_HOLDER_MS;

  for (;;) {
    const acquired = acquireLock(lockPath, { opId, kind: "refresh", title: "Index refresh" }, lockEnv);
    if (acquired.status === "acquired") {
      const beat = setInterval(() => heartbeatLock(lockPath, opId, lockEnv), REFRESH_HEARTBEAT_MS);
      try {
        return await fn();
      } finally {
        clearInterval(beat);
        releaseLock(lockPath, opId);
      }
    }

    // Busy: wait for the live holder (its death turns the lock stale, which
    // the next acquireLock above reaps).
    while (inspectLock(lockPath, lockEnv).state === "held" && Date.now() < deadline) {
      await sleep(WAIT_POLL_MS);
    }
    if (!stillNeeded()) {
      return "refreshed-elsewhere";
    }
    if (Date.now() >= deadline) {
      return "skipped-concurrent";
    }
  }
}

/**
 * Capture an epoch for a mutable snapshot, refusing while a mutation is in
 * flight (see module docstring for why the epoch alone is not enough).
 */
function captureSnapshotEpoch(paths: IndexPaths): number | null {
  if (inspectOperationGate().status === "busy") {
    return null;
  }
  return currentMutationEpoch(paths);
}

interface SliceRefreshGuards {
  /** Epoch fence for refreshers that do not hold the op-lock. */
  startEpoch?: number;
  /** Ownership check for the op-lock holder; false fences the commit. */
  stillOwned?: () => boolean;
}

interface SliceRefreshResult {
  outcome: "refreshed" | "fenced";
  /** Slices from this refresh, for post-operation verification checks. */
  installed: WingetInstalledPackage[];
  upgradable: WingetUpgradePackage[];
}

/**
 * The one incremental refresh mechanism, shared by every refresh site (view
 * mounts, the runner's post-operation refreshes): fetch the three mutable
 * slices concurrently and commit each the moment its query returns, so a
 * view tracking a single slice (Show Upgradable, Show Installed) goes fresh
 * at that slice's own query latency instead of waiting for the slowest of
 * the three.
 *
 * Quality guarantees, preserved from the batch design:
 * - Every commit passes the caller's guard (epoch fence or lock ownership).
 * - A failed query rolls the committed slices back to the pre-refresh
 *   snapshot before the error is rethrown — cross-slice joins in the views
 *   (hasUpdate, isPinned) assume slices from one snapshot, so a partial
 *   refresh must never persist.
 * - mutableAt is stamped by a separate final patch that only runs after all
 *   three slices committed — a partial refresh cannot satisfy the staleness
 *   check even if the rollback itself fails.
 */
async function refreshSlicesIncrementally(paths: IndexPaths, guards: SliceRefreshGuards): Promise<SliceRefreshResult> {
  const before = loadIndex(paths);
  const beforeSlices: MutableSlices = {
    installed: before?.installed ?? [],
    upgradable: before?.upgradable ?? [],
    pinned: before?.pinned ?? [],
  };

  let sawFence = false;
  const commit = (options: { stampMutableAt?: boolean }, mutate: (slices: MutableSlices) => MutableSlices): boolean => {
    if (guards.stillOwned && !guards.stillOwned()) {
      sawFence = true;
      return false;
    }
    const outcome = patchMutable(paths, DEFAULT_ENV, { startEpoch: guards.startEpoch, ...options }, mutate);
    if (outcome !== "committed") {
      sawFence = true;
    }
    return outcome === "committed";
  };

  const committed = { installed: false, upgradable: false, pinned: false };
  let installed: WingetInstalledPackage[] = [];
  let upgradable: WingetUpgradePackage[] = [];
  const settled = await Promise.allSettled([
    listInstalledPackages().then((r) => {
      installed = r.items;
      committed.installed = commit({}, (s) => ({ ...s, installed: r.items }));
    }),
    listUpgradePackages().then((r) => {
      upgradable = r.items;
      committed.upgradable = commit({}, (s) => ({ ...s, upgradable: r.items }));
    }),
    listPinnedPackages().then((r) => {
      committed.pinned = commit({}, (s) => ({ ...s, pinned: r.items }));
    }),
  ]);

  // Handle failures only after every slice settled — a dangling commit after
  // the refresh lock is released could race a later refresh.
  const failure = settled.find((r) => r.status === "rejected");
  if (failure) {
    try {
      if (committed.installed || committed.upgradable || committed.pinned) {
        commit({}, (s) => ({
          installed: committed.installed ? beforeSlices.installed : s.installed,
          upgradable: committed.upgradable ? beforeSlices.upgradable : s.upgradable,
          pinned: committed.pinned ? beforeSlices.pinned : s.pinned,
        }));
      }
    } catch {
      // Rollback is best-effort (the write lock itself may be the failure);
      // mutableAt was never stamped, so the next refresh repairs the index.
    }
    throw failure.reason;
  }
  if (sawFence) {
    return { outcome: "fenced", installed, upgradable };
  }
  const stamped = commit({ stampMutableAt: true }, (s) => s);
  return {
    outcome: stamped ? "refreshed" : "fenced",
    installed,
    upgradable,
  };
}

/** Refresh installed/upgradable/pinned only. */
async function refreshMutableSlices(
  paths: IndexPaths,
  stillNeeded: () => boolean = () => true,
): Promise<RefreshOutcome> {
  if (inspectOperationGate().status === "busy") {
    return "skipped-busy";
  }
  return withRefreshLock(stillNeeded, async () => {
    const startEpoch = captureSnapshotEpoch(paths);
    if (startEpoch === null) {
      return "skipped-busy";
    }
    const { outcome } = await refreshSlicesIncrementally(paths, { startEpoch });
    return outcome;
  });
}

/**
 * Full rebuild: catalog first (committed immediately so Search lights up),
 * then the mutable slices.
 */
async function rebuildFullIndex(paths: IndexPaths, stillNeeded: () => boolean = () => true): Promise<RefreshOutcome> {
  if (inspectOperationGate().status === "busy") {
    return "skipped-busy";
  }
  return withRefreshLock(stillNeeded, async () => {
    const catalog = await searchAllPackages();
    const catalogOutcome = commitCatalog(paths, DEFAULT_ENV, catalog.items);
    if (catalogOutcome === "rejected-shrink") {
      return "failed";
    }

    // Skip the mutable stage when those slices are already fresh — e.g. the
    // mount policy refreshed them moments ago and only the catalog was stale.
    const current = loadIndex(paths);
    if (current?.mutableAt && Date.now() - current.mutableAt < MUTABLE_STALENESS_MS) {
      return "refreshed";
    }

    const startEpoch = captureSnapshotEpoch(paths);
    if (startEpoch === null) {
      // A mutation is running; it refreshes the mutable slices itself when it
      // finishes — the catalog commit above already succeeded.
      return "refreshed";
    }
    // A fenced mutable stage still counts as refreshed: the catalog commit
    // above succeeded and the fencing mutation refreshes the slices itself.
    await refreshSlicesIncrementally(paths, { startEpoch });
    return "refreshed";
  });
}

export {
  MUTABLE_STALENESS_MS,
  rebuildFullIndex,
  refreshMutableSlices,
  refreshSlicesIncrementally,
  type RefreshOutcome,
};
