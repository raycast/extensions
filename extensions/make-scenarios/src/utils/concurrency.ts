export function createPool(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && running < concurrency) {
      running++;
      queue.shift()!();
    }
  }

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          fn()
            .then(resolve, reject)
            .finally(() => {
              running--;
              next();
            });
        });
        next();
      });
    },
  };
}
