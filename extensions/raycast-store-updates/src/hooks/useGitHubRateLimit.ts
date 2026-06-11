import { LocalStorage } from "@raycast/api";
import { useCallback } from "react";

const LAST_FETCH_KEY = "github-last-fetch-time";
const RATE_LIMIT_RESET_KEY = "github-rate-limit-reset";
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UseGitHubRateLimitResult {
  /** Returns null if refresh is allowed, or a message describing when to retry. */
  checkRefreshAllowed: () => Promise<string | null>;
  /** Call after a successful fetch to persist the timestamp. */
  recordFetch: (rateLimitResetEpochSeconds?: number) => Promise<void>;
  /** Call when a 403/429 rate limit error is received. Returns the "try again in X" message. */
  recordRateLimit: (resetEpochSeconds?: number) => Promise<string>;
}

export function useGitHubRateLimit(): UseGitHubRateLimitResult {
  const checkRefreshAllowed = useCallback(async (): Promise<string | null> => {
    const [lastFetch, resetTime] = await Promise.all([
      LocalStorage.getItem<string>(LAST_FETCH_KEY),
      LocalStorage.getItem<string>(RATE_LIMIT_RESET_KEY),
    ]);

    const now = Date.now();
    const lastFetchTime = lastFetch ? parseInt(lastFetch, 10) : 0;
    const rateLimitResetTime = resetTime ? parseInt(resetTime, 10) : null;

    // If we're currently rate limited, block until the reset time
    if (rateLimitResetTime && now < rateLimitResetTime) {
      const msRemaining = rateLimitResetTime - now;
      return formatTimeRemaining(msRemaining);
    }

    // Otherwise enforce the minimum refresh interval
    const msSinceLastFetch = now - lastFetchTime;
    if (lastFetchTime > 0 && msSinceLastFetch < MIN_REFRESH_INTERVAL_MS) {
      const msRemaining = MIN_REFRESH_INTERVAL_MS - msSinceLastFetch;
      return formatTimeRemaining(msRemaining);
    }

    return null;
  }, []);

  const recordFetch = useCallback(async (rateLimitResetEpochSeconds?: number) => {
    await LocalStorage.setItem(LAST_FETCH_KEY, String(Date.now()));

    if (rateLimitResetEpochSeconds) {
      await LocalStorage.setItem(RATE_LIMIT_RESET_KEY, String(rateLimitResetEpochSeconds * 1000));
    } else {
      // Clear any stale rate limit
      await LocalStorage.removeItem(RATE_LIMIT_RESET_KEY);
    }
  }, []);

  const recordRateLimit = useCallback(async (resetEpochSeconds?: number): Promise<string> => {
    // Default: block for 60 minutes if we don't know the reset time
    const resetMs = resetEpochSeconds ? resetEpochSeconds * 1000 : Date.now() + 60 * 60 * 1000;
    await LocalStorage.setItem(RATE_LIMIT_RESET_KEY, String(resetMs));
    return formatTimeRemaining(resetMs - Date.now());
  }, []);

  return { checkRefreshAllowed, recordFetch, recordRateLimit };
}

function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) {
    return `Try again in ${totalSeconds} second${totalSeconds !== 1 ? "s" : ""}`;
  }
  const minutes = Math.ceil(totalSeconds / 60);
  return `Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
