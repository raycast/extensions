export function runConcurrently<T>(
  items: T[],
  concurrency: number,
  startTask: (item: T, done: () => void) => () => void,
): () => void {
  const limit = Math.max(1, Math.floor(concurrency));
  const cleanups: (() => void)[] = [];
  let active = 0;
  let cancelled = false;
  let nextIndex = 0;

  const startNext = () => {
    if (cancelled) return;

    while (active < limit && nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      active += 1;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        active -= 1;
        startNext();
      };
      const cleanup = startTask(item, finish);

      cleanups.push(() => {
        if (finished) return;
        finished = true;
        active -= 1;
        cleanup();
      });
    }
  };

  startNext();

  return () => {
    if (cancelled) return;
    cancelled = true;
    cleanups.forEach((cleanup) => cleanup());
  };
}
