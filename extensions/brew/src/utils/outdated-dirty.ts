/**
 * Staleness flag for the cached outdated-packages snapshot.
 *
 * useBrewOutdated serves its cached last result instantly while a fresh
 * `brew outdated` runs — good default, wrong right after an upgrade run: the
 * cached list still shows the packages that were just upgraded, painting a
 * known-stale review for a second before the refresh lands. An upgrade run
 * sets this flag; on the next launch the hook withholds the cached snapshot
 * until a fresh fetch clears it. Deliberately launch-scoped: the flag is
 * sampled once at mount, so a still-mounted view keeps showing the snapshot
 * it reviewed (⌘R refreshes it) rather than blanking a list mid-session.
 */

import { Cache } from "@raycast/api";

const cache = new Cache();
const DIRTY_KEY = "outdated-snapshot-dirty";

/** An upgrade run changed what is outdated — the cached snapshot is stale. */
export function markOutdatedSnapshotDirty(): void {
  cache.set(DIRTY_KEY, "1");
}

/** A fresh `brew outdated` landed — the cached snapshot is trustworthy again. */
export function clearOutdatedSnapshotDirty(): void {
  cache.remove(DIRTY_KEY);
}

export function isOutdatedSnapshotDirty(): boolean {
  return cache.has(DIRTY_KEY);
}
