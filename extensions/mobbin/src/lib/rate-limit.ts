import { MobbinError } from "./errors";

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
  if (signal?.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true },
    );
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
      const baseMs = retryAfterSeconds
        ? retryAfterSeconds * 1000
        : 2 ** attempt * 750;
      const jitterMs = Math.floor(Math.random() * 250);
      await delay(baseMs + jitterMs, signal);
    }
  }
}
