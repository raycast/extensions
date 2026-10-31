/**
 * One project scan per server, workspace and account, shared by every view and every command.
 *
 * The scan fetches everything Assigned and Created need, so both views filter the same result. The result and
 * the scan lease are keyed by scope, not by view: opening Created while the menu bar refreshes Assigned waits
 * for that scan instead of starting a second one. This module has no Raycast imports: the store, clock and
 * sleep are injected.
 */

import type { KeyValueStore } from "./work-item-backends";
import type { ResultScope } from "./my-work-items";
import { withScanLease } from "./scan-lease";

/** How long a scan serves views that haven't used it yet (switching from Assigned to Created doesn't rescan). */
export const SHARED_SCAN_MEMO_MS = 60 * 1000;

type StoredScan<T> = { value: T; fetchedAt: number; served: string[] };

export type SharedScanDeps<T> = {
  store: KeyValueStore;
  /** From `sharedScanKey`. */
  key: string;
  /** The view asking. A view asking again for a scan it already used is a refresh, and scans again. */
  view: string;
  /** Runs the project scan. */
  run: () => Promise<T>;
  /** False when the result must not be shared (e.g. the workspace changed while it loaded). */
  canStore?: () => boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  memoMs?: number;
  leaseMs?: number;
  pollMs?: number;
};

/** Cache key of the shared scan for one scope. Its lease is stored under `${key}|lease`. */
export function sharedScanKey(scope: ResultScope): string {
  return `${scope.basePath}|${scope.workspaceSlug}|${scope.account}|scan`;
}

function readScan<T>(store: KeyValueStore, key: string): StoredScan<T> | undefined {
  try {
    const raw = store.get(key);
    const scan = raw ? (JSON.parse(raw) as StoredScan<T>) : undefined;
    return scan && typeof scan.fetchedAt === "number" && Array.isArray(scan.served) ? scan : undefined;
  } catch {
    return undefined;
  }
}

function writeScan<T>(store: KeyValueStore, key: string, scan: StoredScan<T>) {
  try {
    store.set(key, JSON.stringify(scan));
  } catch {
    // Sharing is best effort; a failed write only risks one extra scan.
  }
}

function markServed<T>(store: KeyValueStore, key: string, view: string) {
  const scan = readScan<T>(store, key);
  if (scan && !scan.served.includes(view)) writeScan(store, key, { ...scan, served: [...scan.served, view] });
}

/** Scans running in this process, so concurrent callers share the promise instead of polling the lease. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * The shared scan for `view`: a recent scan this view hasn't used yet, the scan already running in this
 * process, or a new scan run under the scope's lease (waiting for another process's scan when one is running).
 */
export async function getSharedScan<T>(deps: SharedScanDeps<T>): Promise<T> {
  const { store, key, view } = deps;
  const now = deps.now ?? Date.now;
  const memoMs = deps.memoMs ?? SHARED_SCAN_MEMO_MS;

  const stored = readScan<T>(store, key);
  const age = stored ? now() - stored.fetchedAt : undefined;
  if (stored && age !== undefined && age >= 0 && age < memoMs && !stored.served.includes(view)) {
    markServed(store, key, view);
    return stored.value;
  }

  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) {
    const value = await running;
    markServed(store, key, view);
    return value;
  }

  const promise = withScanLease<T>({
    store,
    leaseKey: `${key}|lease`,
    readResult: () => {
      const scan = readScan<T>(store, key);
      return scan ? { value: scan.value, fetchedAt: scan.fetchedAt } : undefined;
    },
    run: async () => {
      const value = await deps.run();
      if (deps.canStore?.() ?? true) writeScan(store, key, { value, fetchedAt: now(), served: [] });
      return value;
    },
    now,
    sleep: deps.sleep,
    leaseMs: deps.leaseMs,
    pollMs: deps.pollMs,
  });
  inFlight.set(key, promise);
  try {
    const value = await promise;
    markServed(store, key, view);
    return value;
  } finally {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  }
}
