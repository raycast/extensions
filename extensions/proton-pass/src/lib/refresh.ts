import { Item } from "./types";

/** Items after a refresh: the fresh ones, plus the already known items of vaults that failed to load. */
export function mergeRefreshedItems(
  freshItems: Item[],
  previousItems: Item[],
  failedShareIds: Iterable<string>,
): Item[] {
  const failed = new Set(failedShareIds);
  if (failed.size === 0) return freshItems;
  return [...freshItems, ...previousItems.filter((item) => failed.has(item.shareId))];
}

/** Title of the toast shown for vaults that failed to load. */
export function failedVaultsTitle(vaultNames: string[]): string {
  return vaultNames.length === 1 ? `Couldn't Load ${vaultNames[0]}` : `Couldn't Load ${vaultNames.length} Vaults`;
}

/**
 * Tracks overlapping requests so that only the latest one applies its result, e.g. when Retry is used
 * while a refresh is still running.
 */
export function createRequestTracker() {
  let latest = 0;
  return {
    /** Starts a request; the returned function tells whether it is still the latest one. */
    start(): () => boolean {
      const id = ++latest;
      return () => id === latest;
    },
  };
}
