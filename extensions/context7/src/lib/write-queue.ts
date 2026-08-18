/**
 * Serializes writes within one command process.
 *
 * Every store here is a read-modify-write of a single blob, so two overlapping mutations would
 * both read the pre-change state and the second write would drop the first's change. Chaining
 * them through one promise makes the writes sequential.
 *
 * Per-process only, and deliberately so: cross-process ordering is `withFileLock` in
 * `atomic-file.ts`, which every mutator wraps. This queue just avoids pointless lock
 * contention between concurrent operations that already share a process.
 */
export function createWriteQueue() {
  let queue: Promise<unknown> = Promise.resolve();

  return function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);

    return result;
  };
}
