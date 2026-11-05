export interface ResultBatcher<T> {
  push(item: T): void;
  flush(): void;
  dispose(): void;
}

/**
 * Collects streamed results and delivers them at most once per interval.
 *
 * Every state update in a Raycast command sends a render tree to Raycast's
 * frontend. A search can produce 100 matches within 15 ms, and that many
 * consecutive updates exceed React's nested update limit in the frontend
 * (React error #185), which crashes the command.
 */
export function createResultBatcher<T>(
  onFlush: (items: T[]) => void,
  intervalMs: number,
): ResultBatcher<T> {
  let pending: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function flush() {
    clearTimer();
    if (disposed || pending.length === 0) return;
    const items = pending;
    pending = [];
    onFlush(items);
  }

  return {
    push(item) {
      if (disposed) return;
      pending.push(item);
      if (!timer) timer = setTimeout(flush, intervalMs);
    },
    flush,
    dispose() {
      disposed = true;
      clearTimer();
      pending = [];
    },
  };
}
