/**
 * Coordinates the project scan across commands. The menu bar, My Work Items and the AI tool run in
 * separate processes, so only Raycast's on-disk `Cache` is shared. Without coordination two of them can
 * scan at once and spend up to 80 of the server's 60 requests per minute.
 *
 * The first caller writes a lease and scans; a caller that finds a live lease waits for the shared
 * result to appear instead of scanning too. A stale lease (crashed or killed process) is ignored.
 * This module has no Raycast imports: the store, clock and sleep are injected.
 */

import type { KeyValueStore } from "./work-item-backends";

/** Longest a scan is expected to take. After this a lease is considered stale. */
export const SCAN_LEASE_MS = 90 * 1000;
/** How often a waiting caller checks for the other process's result. */
export const SCAN_LEASE_POLL_MS = 1000;

type Lease = { startedAt: number };

export type ScanLeaseDeps<T> = {
  store: KeyValueStore;
  leaseKey: string;
  /** Reads the shared result and the time it was fetched, if any. */
  readResult: () => { value: T; fetchedAt: number } | undefined;
  /** Runs the scan; the caller writes the shared result. */
  run: () => Promise<T>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  leaseMs?: number;
  pollMs?: number;
};

function readLease(store: KeyValueStore, key: string): Lease | undefined {
  try {
    const raw = store.get(key);
    const lease = raw ? (JSON.parse(raw) as Lease) : undefined;
    return typeof lease?.startedAt === "number" ? lease : undefined;
  } catch {
    return undefined;
  }
}

function safely(action: () => void) {
  try {
    action();
  } catch {
    // The lease is an optimization; a failed write only risks one extra scan.
  }
}

/** Runs `run` unless another process is already scanning, in which case it waits for that result. */
export async function withScanLease<T>(deps: ScanLeaseDeps<T>): Promise<T> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const leaseMs = deps.leaseMs ?? SCAN_LEASE_MS;
  const pollMs = deps.pollMs ?? SCAN_LEASE_POLL_MS;

  const lease = readLease(deps.store, deps.leaseKey);
  const start = now();
  if (lease && start - lease.startedAt >= 0 && start - lease.startedAt < leaseMs) {
    const deadline = lease.startedAt + leaseMs;
    while (now() < deadline) {
      const result = deps.readResult();
      if (result && result.fetchedAt >= lease.startedAt) return result.value;
      if (!readLease(deps.store, deps.leaseKey)) {
        // The other scan ended without a usable result (it failed); check once more, then scan ourselves.
        const last = deps.readResult();
        if (last && last.fetchedAt >= lease.startedAt) return last.value;
        break;
      }
      await sleep(pollMs);
    }
  }

  const startedAt = now();
  safely(() => deps.store.set(deps.leaseKey, JSON.stringify({ startedAt } satisfies Lease)));
  try {
    return await deps.run();
  } finally {
    // Only clear our own lease; a newer one belongs to another process.
    if (readLease(deps.store, deps.leaseKey)?.startedAt === startedAt) {
      safely(() => deps.store.remove(deps.leaseKey));
    }
  }
}
