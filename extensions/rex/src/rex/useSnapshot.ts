import { Cache, getPreferenceValues } from "@raycast/api";
import { useMemo, useSyncExternalStore } from "react";
import { locateRex, serverFlags, type RexInstall } from "./cli";
import { subscribeToRexEvents } from "./events";
import { warmIcons } from "./icons";
import { fetchSnapshot } from "./snapshot";
import { createSnapshotStore, type SnapshotStore, type SnapshotStoreState } from "./snapshot-store";
import { LOCAL_HOST, type RexSnapshot } from "./types";

/** Fallback poll; changes normally arrive through Rex's event stream within a fraction of a second. */
export const LIVE_REFRESH_MS = 15000;

export interface SnapshotState extends SnapshotStoreState {
  install?: RexInstall;
  revalidate: () => void;
}

const cache = new Cache();
/** One store per CLI, shared by the command's root view and every view pushed on top of it. */
const stores = new Map<string, SnapshotStore>();

function cachedSnapshot(key: string): RexSnapshot | undefined {
  try {
    const value = cache.get(key);
    return value ? (JSON.parse(value) as RexSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

function storeFor(install: RexInstall): SnapshotStore {
  const existing = stores.get(install.bin);
  if (existing) return existing;
  const cacheKey = `snapshot:${install.bin}`;
  const { liveRefresh } = getPreferenceValues<Preferences>();
  const store = createSnapshotStore(
    {
      async read(signal) {
        const snapshot = await fetchSnapshot(install, signal);
        snapshot.localDevice = await warmIcons(snapshot);
        if (!signal.aborted) {
          try {
            cache.set(cacheKey, JSON.stringify(snapshot));
          } catch {
            // A cache failure must not hide a successful read from Rex.
          }
        }
        return snapshot;
      },
      targets: (hosts) =>
        (hosts.length ? hosts : [LOCAL_HOST]).map((host) => [
          "--color",
          "never",
          ...serverFlags(host),
          "events",
          "--all",
          "--json",
        ]),
      follow: (targets, onChange) => subscribeToRexEvents(install.bin, targets, onChange),
      pollMs: liveRefresh ? LIVE_REFRESH_MS : undefined,
    },
    cachedSnapshot(cacheKey),
  );
  stores.set(install.bin, store);
  return store;
}

const NOT_INSTALLED: SnapshotStoreState = { isLoading: false };
const notInstalled = () => NOT_INSTALLED;
const ignore = () => undefined;
const subscribeToNothing = () => ignore;

/**
 * Sessions, windows, and blocks from every Rex host.
 *
 * Shows the last cached snapshot first, then refreshes whenever Rex reports a change through its event
 * stream, with a slow fallback poll while the "Fallback Refresh" preference is on. Every mounted view
 * shares one read, one set of streams, and one poller.
 */
export function useRexSnapshot(): SnapshotState {
  const install = useMemo(locateRex, []);
  const store = useMemo(() => (install ? storeFor(install) : undefined), [install]);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeToNothing, store?.getState ?? notInstalled);
  return { install, ...state, revalidate: store?.refresh ?? ignore };
}
