/**
 * Executes asynchronous work with a bounded number of workers.
 *
 * Results stay aligned with the input positions. Once a worker rejects, the
 * scheduler rejects and does not start any further items; already-started work
 * is allowed to settle in the background.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(limit)) {
    throw new RangeError("mapWithConcurrency limit must be a finite positive integer");
  }
  if (items.length === 0) return [];

  return new Promise<R[]>((resolve, reject) => {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    let active = 0;
    let completed = 0;
    let stopped = false;

    const schedule = (): void => {
      while (!stopped && active < limit && nextIndex < items.length) {
        const index = nextIndex++;
        active += 1;

        Promise.resolve()
          .then(() => worker(items[index], index))
          .then(
            (value) => {
              active -= 1;
              results[index] = value;
              completed += 1;
              if (completed === items.length) {
                resolve(results);
                return;
              }
              schedule();
            },
            (error: unknown) => {
              active -= 1;
              if (stopped) return;
              stopped = true;
              reject(error);
            },
          );
      }
    };

    schedule();
  });
}
