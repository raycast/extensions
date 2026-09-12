/**
 * Runs `worker` over `items` with at most `limit` workers in flight at once.
 * Preserves input order in the returned array regardless of completion order.
 *
 * @example
 *   const sizes = await mapWithConcurrency(paths, 4, async (p) => {
 *     return computeDirectorySize(p);
 *   });
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function pump(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  }
  const poolSize = Math.max(0, Math.min(limit, items.length));
  const workers = Array.from({ length: poolSize }, () => pump());
  await Promise.all(workers);
  return results;
}
