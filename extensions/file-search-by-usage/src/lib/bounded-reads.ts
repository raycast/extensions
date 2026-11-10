type Result = { value?: unknown; error?: unknown; failed: boolean };
type Job = { listeners: Set<(result: Result) => void> };

/** Slots follow physical reads; cancelled callers detach without freeing a slot. */
export function createReadPool(limit = 8) {
  const jobs = new Map<unknown, Job>();
  const waiting = new Set<() => void>();
  return function read<T>(
    key: unknown,
    work: () => Promise<T>,
    signal: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let job: Job | undefined;
      let done = false;
      const finish = (result: Result) => {
        if (done) return;
        done = true;
        waiting.delete(attempt);
        job?.listeners.delete(finish);
        signal.removeEventListener("abort", stop);
        if (result.failed) reject(result.error);
        else resolve(result.value as T);
      };
      const stop = () =>
        finish({ failed: true, error: new Error("Read cancelled") });
      const attempt = () => {
        if (done) return;
        if (signal.aborted) return stop();
        job = jobs.get(key);
        if (!job && jobs.size >= limit) {
          waiting.add(attempt);
          return;
        }
        waiting.delete(attempt);
        if (!job) {
          job = { listeners: new Set() };
          const started = job;
          jobs.set(key, started);
          const complete = (result: Result) => {
            jobs.delete(key);
            for (const listener of [...started.listeners]) listener(result);
            for (const next of [...waiting]) next();
          };
          Promise.resolve()
            .then(() => {
              if (started.listeners.size === 0)
                throw new Error("Read cancelled");
              return work();
            })
            .then(
              (value) => complete({ failed: false, value }),
              (error) => complete({ failed: true, error }),
            );
        }
        job.listeners.add(finish);
      };
      signal.addEventListener("abort", stop, { once: true });
      attempt();
    });
  };
}
