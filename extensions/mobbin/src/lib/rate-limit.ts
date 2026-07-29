import { MobbinError } from "./errors";
import { abortError } from "./errors";

const MAX_ATTEMPTS = 3;

export function parseRetryAfterSeconds(
  value: string | null,
): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;

  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }

  return undefined;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError(signal.reason));

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortError(signal?.reason));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
  maxAttempts = MAX_ATTEMPTS,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (
        !(error instanceof MobbinError) ||
        error.code !== "rate-limited" ||
        attempt >= maxAttempts
      ) {
        throw error;
      }

      const retryAfterSeconds = error.details?.retryAfterSeconds;
      const baseMs =
        retryAfterSeconds !== undefined
          ? retryAfterSeconds * 1000
          : 2 ** attempt * 750;
      const jitterMs =
        retryAfterSeconds === undefined ? Math.floor(Math.random() * 250) : 0;
      await delay(baseMs + jitterMs, signal);
    }
  }
}
