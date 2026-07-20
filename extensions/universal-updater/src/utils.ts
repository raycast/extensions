/**
 * utils.ts — shared utilities for Universal Updater
 *
 * Provides:
 *  - pLimit: lightweight concurrency limiter (prevents OOM from too many parallel shell processes)
 *  - withTimeout: wraps any promise with a maximum wait time
 *  - debounce: delays function execution until input settles
 *  - formatBytes: human-readable byte sizes
 */

// ─── Concurrency Limiter ──────────────────────────────────────────────────────
// Prevents spawning more than `concurrency` shell processes at once.
// This is the fix for the "JS heap out of memory" crash.

export function pLimit(concurrency: number) {
  const queue: Array<() => void> = [];
  let active = 0;

  function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const run = queue.shift()!;
    run();
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          active--;
          next();
        }
      });
      next();
    });
  };
}

// ─── Timeout Wrapper ──────────────────────────────────────────────────────────
// Races a promise against a timeout. If the timeout fires first, rejects
// with a clear error message so the UI shows a graceful "Timed out" state.

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "Operation",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
// Returns a debounced version of fn that only fires after `ms` of silence.
// Used in search inputs to prevent firing a network request on every keystroke.

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

// ─── Format Bytes ─────────────────────────────────────────────────────────────
// Converts raw byte counts into human-readable strings (KB, MB, GB).

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Run all with limit ───────────────────────────────────────────────────────
// Helper: run an array of async tasks with a concurrency cap.
// Returns results in the same order as inputs (like Promise.all but bounded).

export async function mapWithLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 3,
): Promise<R[]> {
  const limit = pLimit(concurrency);
  return Promise.all(items.map((item) => limit(() => fn(item))));
}
