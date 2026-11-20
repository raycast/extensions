/** Request de-duplication. Pure (no Raycast imports). */

/**
 * Returns `share(key, start)`: while a call for `key` is running, later callers get the same promise
 * instead of starting another. Once it settles, the next call starts fresh.
 */
export function inFlight<T>() {
  const pending = new Map<string, Promise<T>>();
  return function share(key: string, start: () => Promise<T>): Promise<T> {
    const running = pending.get(key);
    if (running) return running;
    const p = start().finally(() => pending.delete(key));
    pending.set(key, p);
    return p;
  };
}
