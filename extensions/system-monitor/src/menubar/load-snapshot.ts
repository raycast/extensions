import { Cache, LaunchType, LocalStorage } from "@raycast/api";
import path from "path";

import { collectMenuBarSnapshot } from "./collect-snapshot";
import { withCollectionLease } from "./collection-lease";
import { readMenuBarSnapshot, removeLegacyMenuBarCache, SnapshotCache, writeMenuBarSnapshot } from "./snapshot-cache";
import { MenuBarCollectors, MenuBarSnapshot, normalizePinnedStat, PinnedStat } from "./types";

export const PINNED_STAT_KEY = "menubarPinnedStat";
export const MENU_BAR_COLLECTION_LOCK = "menubar-collection-v1.lock";

interface PinnedStatStorage {
  getItem(key: string): Promise<unknown>;
}

export interface LoadMenuBarSnapshotOptions {
  launchType: LaunchType;
  supportPath: string;
  storage?: PinnedStatStorage;
  cache?: SnapshotCache;
  collectors?: MenuBarCollectors;
  now?: () => number;
}

export interface LoadedMenuBarSnapshot {
  pinnedStat: PinnedStat;
  snapshot?: MenuBarSnapshot;
  collectionState: "collected" | "another-background-collection-active";
}

/** Resolve launch context and the pin preference before any collector can run. */
export async function loadMenuBarSnapshot({
  launchType,
  supportPath,
  storage = LocalStorage,
  cache = new Cache(),
  collectors,
  now,
}: LoadMenuBarSnapshotOptions): Promise<LoadedMenuBarSnapshot> {
  const pinnedValue = await storage.getItem(PINNED_STAT_KEY);
  const pinnedStat = normalizePinnedStat(typeof pinnedValue === "string" ? pinnedValue : undefined);
  const previous = readMenuBarSnapshot(cache);
  removeLegacyMenuBarCache(cache);
  const collect = () => collectMenuBarSnapshot({ launchType, pinnedStat, previous, collectors, now });

  if (launchType === LaunchType.Background) {
    const result = await withCollectionLease(
      { lockDirectory: path.join(supportPath, MENU_BAR_COLLECTION_LOCK), now },
      collect,
    );
    if (result.status === "active") {
      return { pinnedStat, snapshot: previous, collectionState: "another-background-collection-active" };
    }

    writeMenuBarSnapshot(result.value, cache);
    return { pinnedStat, snapshot: result.value, collectionState: "collected" };
  }

  const snapshot = await collect();
  writeMenuBarSnapshot(snapshot, cache);
  return { pinnedStat, snapshot, collectionState: "collected" };
}
