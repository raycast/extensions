/** Bound shared subprocess work and remove cancelled requests before they start. */
export function createTaskQueue(limit: number) {
  let active = 0;
  const pending: (() => void)[] = [];

  function drain() {
    while (active < limit && pending.length) pending.shift()!();
  }

  return function enqueue<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      signal?.throwIfAborted();
      const cancel = () => {
        const index = pending.indexOf(start);
        if (index >= 0) pending.splice(index, 1);
        reject(signal!.reason);
      };
      async function start() {
        active++;
        signal?.removeEventListener("abort", cancel);
        try {
          signal?.throwIfAborted();
          const result = await task();
          signal?.throwIfAborted();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          active--;
          drain();
        }
      }
      pending.push(start);
      signal?.addEventListener("abort", cancel, { once: true });
      drain();
    });
  };
}
