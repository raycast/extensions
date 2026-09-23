import { LocalStorage } from "@raycast/api";
import { useCallback } from "react";

const LAST_FETCH_KEY = "github-last-fetch-time";
const RATE_LIMIT_RESET_KEY = "github-rate-limit-reset";
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
/** GitHub's rate-limit window is 1h, so no honest cooldown exceeds it. */
const MAX_COOLDOWN_MS = 60 * 60 * 1000;

interface UseGitHubRateLimitResult {
  /** Returns null if refresh is allowed, or a message describing when to retry. */
  checkRefreshAllowed: () => Promise<string | null>;
  /** Call after a successful fetch to persist the timestamp. */
  recordFetch: (info?: { remaining?: number; resetEpochSeconds?: number }) => Promise<void>;
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

  const recordFetch = useCallback(async (info?: { remaining?: number; resetEpochSeconds?: number }) => {
    await LocalStorage.setItem(LAST_FETCH_KEY, String(Date.now()));

    // The unauthenticated GitHub API returns X-RateLimit-Reset on EVERY response
    // (it is the epoch when the hourly window rolls over, not a "blocked until" time).
    // Only treat it as a block when the quota is actually exhausted (remaining === 0),
    // otherwise a normal success would falsely gate refreshes for the rest of the hour.
    if (info && info.remaining === 0 && info.resetEpochSeconds) {
      await LocalStorage.setItem(RATE_LIMIT_RESET_KEY, String(info.resetEpochSeconds * 1000));
    } else {
      // Clear any stale rate limit; successful fetches are gated by MIN_REFRESH_INTERVAL instead.
      await LocalStorage.removeItem(RATE_LIMIT_RESET_KEY);
    }
  }, []);

  const recordRateLimit = useCallback(async (resetEpochSeconds?: number): Promise<string> => {
    // Only honor a reset time GitHub actually sent, and only if it is in the future
    // and within the 1h its limit window can span. Without a usable reset, fall back to
    // the ordinary 5-minute interval — NOT an invented hour. Guessing long on unknown
    // evidence turns a transient proxy 403 into a 60-minute lockout.
    const now = Date.now();
    const reported = resetEpochSeconds ? resetEpochSeconds * 1000 : null;
    const isUsable = reported !== null && reported > now && reported <= now + MAX_COOLDOWN_MS;
    const resetMs = isUsable ? reported : now + MIN_REFRESH_INTERVAL_MS;
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
