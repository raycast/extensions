/**
 * Runs `fn` over every item in `items`, but never more than `limit` calls in flight at once - a
 * self-hosted Dokploy instance (this extension's whole audience) isn't built to take hundreds of
 * simultaneous requests, unlike `Promise.allSettled(items.map(fn))` which fires them all at once.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = { status: "fulfilled", value: await fn(items[current]) };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
