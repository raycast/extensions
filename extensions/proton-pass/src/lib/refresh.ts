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

/** A vault whose items couldn't be listed, as listVaultsAndItems() reports it. */
interface ListingFailure {
  vault: { shareId: string };
  message: string;
}

/**
 * Outcome of a refresh. Vaults that failed keep their known items, only a complete listing may renew the
 * cache, and a listing that failed with nothing left to show is a failure rather than an empty account.
 */
export function getRefreshResult(
  freshItems: Item[],
  previousItems: Item[],
  failures: ListingFailure[],
  isShown: (item: Item) => boolean = () => true,
): { items: Item[]; isComplete: boolean; failureMessage?: string } {
  const items = mergeRefreshedItems(
    freshItems,
    previousItems,
    failures.map(({ vault }) => vault.shareId),
  );
  const failureMessage = failures.length > 0 && !items.some(isShown) ? failures[0].message : undefined;
  return { items, isComplete: failures.length === 0, failureMessage };
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

/** Runs tasks one after the other, in the order they were queued, e.g. cache writes of overlapping refreshes. */
export function createSerialQueue() {
  let last: Promise<unknown> = Promise.resolve();
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = last.then(task);
      last = result.catch(() => undefined);
      return result;
    },
  };
}
