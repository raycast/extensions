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
