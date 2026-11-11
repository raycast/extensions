import { listedUnder, withoutDuplicates } from "./shared-items";
import { Item } from "./types";

/** A vault whose items couldn't be listed, as listVaultsAndItems() reports it. */
interface ListingFailure {
  vault: { shareId: string };
  message: string;
  /** The shares that failed within the vault, e.g. some of the items shared with the user. All of them when missing. */
  shareIds?: string[];
}

/** Items after a refresh: the fresh ones, plus the already known items of the vaults, or shares, that failed to load. */
export function mergeRefreshedItems(
  freshItems: Item[],
  previousItems: Item[],
  failures: Omit<ListingFailure, "message">[],
): Item[] {
  if (failures.length === 0) return freshItems;
  const hasFailed = (item: Item) =>
    failures.some(
      ({ vault, shareIds }) => listedUnder(item) === vault.shareId && (!shareIds || shareIds.includes(item.shareId)),
    );
  // An item kept from a failed vault may have loaded through its share, or the reverse: it still shows once.
  return withoutDuplicates([...freshItems, ...previousItems.filter(hasFailed)]);
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
  const items = mergeRefreshedItems(freshItems, previousItems, failures);
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

/**
 * Orders the saves of complete listings across views: the vault list and the item lists it opens list in parallel,
 * and a listing that started before the one saved last must not replace it.
 */
export function createListingSaves() {
  const queue = createSerialQueue();
  let started = 0;
  let saved = 0;
  return {
    /** Numbers a listing as it starts, for `save`. */
    start: () => ++started,
    /** Runs `write` unless a listing that started later was saved first. Tells whether it ran. */
    save(listing: number, write: () => Promise<unknown>): Promise<boolean> {
      return queue.run(async () => {
        if (listing < saved) return false;
        saved = listing;
        await write();
        return true;
      });
    },
  };
}

/** Shared by the views of a command, e.g. the vault list and the item lists it opens. */
export const listingSaves = createListingSaves();

/** `promise`'s value, or nothing if it takes longer than `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}
