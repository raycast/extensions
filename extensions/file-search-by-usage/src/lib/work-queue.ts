/** Bounded pending work with independent workers and cancellation-aware producers. */
export function createWorkQueue<T>(
  work: (items: T[]) => Promise<void>,
  signal: AbortSignal,
  { concurrency = 1, batchSize = 1, maxPending = 256 } = {},
) {
  const pending: T[] = [];
  const changed = new Set<() => void>();
  let running = 0;
  let failure: unknown;
  const notify = () => {
    for (const wake of [...changed]) wake();
    changed.clear();
  };
  const wait = () => new Promise<void>((resolve) => changed.add(resolve));
  const stop = () => {
    pending.length = 0;
    notify();
    signal.removeEventListener("abort", stop);
  };
  signal.addEventListener("abort", stop, { once: true });
  const pump = () => {
    while (!signal.aborted && running < concurrency && pending.length > 0) {
      const batch = pending.splice(0, batchSize);
      running++;
      void Promise.resolve()
        .then(() => {
          if (!signal.aborted) return work(batch);
        })
        .catch((error: unknown) => {
          failure ??= error;
        })
        .finally(() => {
          running--;
          pump();
          notify();
        });
    }
    notify();
  };
  return {
    dispose: stop,
    async push(items: T[]) {
      for (const item of items) {
        while (!signal.aborted && pending.length >= maxPending) await wait();
        if (signal.aborted) return;
        pending.push(item);
        pump();
      }
    },
    async drain() {
      while (!signal.aborted && (running > 0 || pending.length > 0))
        await wait();
      if (!signal.aborted && failure !== undefined) throw failure;
    },
  };
}
