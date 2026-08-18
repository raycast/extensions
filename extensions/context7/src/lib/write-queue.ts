/**
 * Serializes writes within one command process.
 *
 * Every store here is a read-modify-write of a single blob, so two overlapping mutations would
 * both read the pre-change state and the second write would drop the first's change. Chaining
 * them through one promise makes the writes sequential.
 *
 * ponytail: per-process only. Raycast runs each command in its own process, so this does NOT
 * serialize across commands — that residual lost-update window is handled by making the writes
 * themselves atomic (see `atomic-file.ts`). Per-file locking is the upgrade if it ever bites.
 */
export function createWriteQueue() {
  let queue: Promise<unknown> = Promise.resolve();

  return function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);

    return result;
  };
}

const MAX_ATTEMPTS = 5;

/**
 * Optimistic concurrency for a store that is shared across command processes.
 *
 * The queue above only orders writes *within* one process. Raycast runs each command in its
 * own, and an AI tool can mutate a store while a command is open, so two processes can each
 * read the whole collection, modify their copy, and write it back — the second silently
 * discarding the first's change.
 *
 * Every mutation therefore re-reads the raw stored value immediately before writing and
 * restarts if it changed, so a concurrent write is re-applied on top instead of overwritten.
 * `apply` must be pure: it is called again on each attempt.
 */
export async function compareAndSwap<S, R>(store: {
  readRaw: () => Promise<string>;
  parse: (raw: string) => S;
  apply: (value: S) => { next: S; result: R };
  write: (next: S) => Promise<void>;
}): Promise<R> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const before = await store.readRaw();
    const { next, result } = store.apply(store.parse(before));

    // Someone else wrote while this attempt was computing, so `next` was derived from stale
    // data. Drop it and redo the work against what is actually stored now.
    if ((await store.readRaw()) !== before) {
      continue;
    }

    await store.write(next);

    return result;
  }

  throw new Error("Could not save — the data kept changing while saving. Try again.");
}
