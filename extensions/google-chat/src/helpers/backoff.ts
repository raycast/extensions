/** Retry helpers for Google API calls. Pure: no Raycast imports, so they are unit tested. */

export interface RetryDecision {
  retry: boolean;
  /** Server-suggested wait (from `Retry-After`), in milliseconds. */
  retryAfterMs?: number;
}

export interface BackoffOptions {
  /** Total attempts including the first one. Default 3. */
  maxAttempts?: number;
  /** Delay before the second attempt. Doubles each time. Default 500 ms. */
  baseDelayMs?: number;
  /** Upper bound for a single wait. Default 8 s. */
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Returns a number in [0, 1) for jitter. Default `Math.random`. */
  random?: () => number;
}

export const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff delay with up to 25% jitter. `attempt` is 1 for the first retry.
 * A server `Retry-After` wins when it is longer (capped at 60 s).
 */
export function backoffDelay(
  attempt: number,
  baseDelayMs = 500,
  maxDelayMs = 8000,
  random: () => number = Math.random,
  retryAfterMs?: number,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const capped = Math.min(maxDelayMs, Math.round(exponential * (1 + 0.25 * random())));
  return retryAfterMs !== undefined && retryAfterMs > capped ? Math.min(retryAfterMs, 60_000) : capped;
}

/** Parses a `Retry-After` header (seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/**
 * Runs `fn`, retrying while `shouldRetry` says so, up to `maxAttempts` tries in total.
 * The last error is rethrown unchanged.
 */
export async function withBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  shouldRetry: (error: unknown) => RetryDecision,
  options: BackoffOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 8000, sleep = defaultSleep, random = Math.random } = options;
  let attempt = 1;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (error) {
      const decision = shouldRetry(error);
      if (!decision.retry || attempt >= maxAttempts) throw error;
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs, random, decision.retryAfterMs));
      attempt += 1;
    }
  }
}

/**
 * Google API calls in flight at once for per-conversation lookups. Each call goes to a different space, so it
 * stays under the per-space limit (15 reads a second), and a burst of a few dozen is far below the per-project
 * ones (3,000 reads a minute).
 */
export const REQUEST_CONCURRENCY = 10;

/** Runs `fn` over `items` with at most `limit` calls in flight. Keeps input order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
