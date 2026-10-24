// Stands in for timers/promises' setTimeout: resolves on the next turn of the event loop, honours the abort signal like
// Node's, and records the delays it was asked for.
export const sleeps: number[] = [];

export function setTimeout<T = void>(delay: number, value?: T, options?: { signal?: AbortSignal }): Promise<T> {
  sleeps.push(delay);
  const signal = options?.signal;
  const abortError = () =>
    Object.assign(new Error("The operation was aborted", { cause: signal?.reason }), {
      name: "AbortError",
      code: "ABORT_ERR",
    });
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearImmediate(timer);
      reject(abortError());
    };
    const timer = setImmediate(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(value as T);
    });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
