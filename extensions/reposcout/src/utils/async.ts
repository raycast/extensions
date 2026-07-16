/**
 * Async utilities for bounded concurrency. Enriching thousands of repositories
 * with Git metadata must not spawn thousands of simultaneous git processes, so
 * work is run through a fixed-size worker pool.
 */

/**
 * Map over `items` running `worker` with at most `concurrency` tasks in flight
 * at once. Results are returned in the original input order. A worker that
 * rejects fails the whole batch, so workers should convert expected failures
 * into values (e.g. a {@link import("./result").Result}).
 *
 * @param items       Inputs to process.
 * @param concurrency Maximum number of concurrent workers (clamped to >= 1).
 * @param worker      Async function invoked per item with its index.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    for (;;) {
      const current = nextIndex++;
      if (current >= items.length) {
        return;
      }
      results[current] = await worker(items[current] as T, current);
    }
  }

  const poolSize = Math.min(limit, items.length);
  const pool: Promise<void>[] = [];
  for (let i = 0; i < poolSize; i++) {
    pool.push(runWorker());
  }
  await Promise.all(pool);
  return results;
}
