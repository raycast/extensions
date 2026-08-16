import { RateLimitError, TickTickError } from "../domain/errors";

export function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

export async function executeRead<T>(
  operation: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
  signal?: AbortSignal
): Promise<T> {
  throwIfAborted(signal);
  try {
    return await operation();
  } catch (error) {
    throwIfAborted(signal);
    if (!(error instanceof TickTickError) || !error.retryable) throw error;

    const delay = error instanceof RateLimitError ? error.retryAfterMs : 250;
    if (delay === undefined) throw error;

    await sleepUntilRetry(delay, sleep, signal);
    throwIfAborted(signal);
    return operation();
  }
}

async function sleepUntilRetry(
  delay: number,
  sleep: (ms: number) => Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  if (!signal) {
    await sleep(delay);
    return;
  }

  throwIfAborted(signal);
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => {
      try {
        throwIfAborted(signal);
      } catch (error) {
        reject(error);
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    throwIfAborted(signal);
    await Promise.race([sleep(delay), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
