/** One write queue and snapshot for all views using the same saved list. */
export function createListStore<T>(read: () => Promise<T[]>, write: (items: T[]) => Promise<void>) {
  let snapshot: { items: T[]; isLoading: boolean; error?: string } = { items: [], isLoading: true };
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  function publish(next: typeof snapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function enqueue(operation: () => Promise<void>) {
    const result = queue.then(operation).catch((error: unknown) => {
      publish({
        ...snapshot,
        isLoading: false,
        error: error instanceof Error ? error.message : "Storage unavailable.",
      });
      throw error;
    });
    queue = result.catch(() => undefined);
    return result;
  }

  function reload() {
    return enqueue(async () => {
      publish({ ...snapshot, isLoading: true });
      publish({ items: await read(), isLoading: false });
    });
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reload,
    update(updater: (items: T[]) => T[]) {
      return enqueue(async () => {
        // Read after earlier writes have completed, including writes from another view.
        const next = updater(await read());
        await write(next);
        publish({ items: next, isLoading: false });
      });
    },
  };
}
