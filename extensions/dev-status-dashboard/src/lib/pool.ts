/**
 * Runs `worker` over `items` with at most `concurrency` promises in flight, so the dashboard
 * doesn't fire ~18 requests at once. Results keep the input order; a worker is expected to catch
 * its own errors (the dashboard maps failures to an "unreachable" state rather than rejecting).
 */
export async function runBatched<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 5): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const current = next++;
      results[current] = await worker(items[current]);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, run);
  await Promise.all(runners);
  return results;
}
