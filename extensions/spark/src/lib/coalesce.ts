// Sharing one Spark request among callers that ask the same thing at once.
//
// No Raycast imports here: this file runs under `node --test` as-is.

/// Runs `task` once for every key still in flight: a caller asking for a key
/// that's already running gets the running promise. Once it settles, the next
/// caller starts afresh, so nothing is cached beyond the request itself.
export function coalescing<T>(): (key: string, task: () => Promise<T>) => Promise<T> {
  const inFlight = new Map<string, Promise<T>>();
  return (key, task) => {
    const running = inFlight.get(key);
    if (running) return running;
    const request = task().finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
}
