import { getPreferenceValues } from "@raycast/api";
import {
  createAppError,
  createHttpError,
  type AppError,
} from "../utils/errors";

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

let rateLimitInfo: RateLimitInfo | null = null;

/**
 * Get current rate limit information
 */
export function getRateLimitInfo(): RateLimitInfo | null {
  return rateLimitInfo;
}

/**
 * Check if rate limit is exhausted
 */
export function isRateLimitExhausted(): boolean {
  if (!rateLimitInfo) return false;
  return rateLimitInfo.remaining === 0 && rateLimitInfo.resetAt > new Date();
}

/**
 * Get time until rate limit reset
 */
export function getTimeUntilReset(): number {
  if (!rateLimitInfo) return 0;
  return Math.max(0, rateLimitInfo.resetAt.getTime() - Date.now());
}

/**
 * Get GitHub token from preferences
 */
function getGitHubToken(): string | undefined {
  const { githubToken } = getPreferenceValues<Preferences>();
  return githubToken && githubToken.trim() !== ""
    ? githubToken.trim()
    : undefined;
}

/**
 * Update rate limit info from response headers
 */
function updateRateLimitFromHeaders(headers: Headers): void {
  const remaining = headers.get("x-ratelimit-remaining");
  const limit = headers.get("x-ratelimit-limit");
  const reset = headers.get("x-ratelimit-reset");

  if (remaining && limit && reset) {
    rateLimitInfo = {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      resetAt: new Date(parseInt(reset, 10) * 1000),
    };
  }
}

/**
 * Create rate limit error with reset time info
 */
function createRateLimitError(): AppError {
  const resetTime = Math.ceil(getTimeUntilReset() / 1000 / 60);
  return createAppError(
    "RATE_LIMIT_EXCEEDED",
    `GitHub API rate limit exceeded. Resets in ${resetTime} minutes.`,
    {
      resetTime,
      rateLimitInfo,
    },
  );
}

/**
 * Fetch from GitHub API with authentication and rate limit tracking
 */
export async function fetchGitHub(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  const token = getGitHubToken();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Raycast-DevContainer-Features",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers, signal });
  updateRateLimitFromHeaders(response.headers);

  return response;
}

/**
 * Fetch text content from GitHub with rate limit handling
 * Returns null on non-critical errors (404, etc.) to allow fallback
 * Throws AppError on critical errors (rate limit, network)
 */
export async function fetchGitHubText(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (isRateLimitExhausted()) {
    throw createRateLimitError();
  }

  try {
    const response = await fetchGitHub(url, signal);

    // Check for rate limit from response
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw createRateLimitError();
      }
    }

    // Return null for 404 to allow fallback
    if (response.status === 404) {
      return null;
    }

    // Throw for other HTTP errors
    if (!response.ok) {
      throw createHttpError(
        response.status,
        `GitHub API error: ${response.status}`,
      );
    }

    return await response.text();
  } catch (err) {
    // Re-throw AbortError for cleanup handling
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    // Re-throw AppError
    if (err !== null && typeof err === "object" && "code" in err) {
      throw err;
    }
    // Return null for other errors to allow fallback
    console.error("Failed to fetch from GitHub:", err);
    return null;
  }
}

/**
 * Fetch JSON from GitHub API
 * Returns null on non-critical errors to allow fallback
 * Throws AppError on critical errors
 */
export async function fetchGitHubJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T | null> {
  if (isRateLimitExhausted()) {
    throw createRateLimitError();
  }

  try {
    const response = await fetchGitHub(url, signal);

    // Check for rate limit from response
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw createRateLimitError();
      }
    }

    // Return null for 404 to allow fallback
    if (response.status === 404) {
      return null;
    }

    // Throw for other HTTP errors
    if (!response.ok) {
      throw createHttpError(
        response.status,
        `GitHub API error: ${response.status}`,
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    // Re-throw AbortError for cleanup handling
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    // Re-throw AppError
    if (err !== null && typeof err === "object" && "code" in err) {
      throw err;
    }
    // Return null for other errors to allow fallback
    console.error("Failed to fetch JSON from GitHub:", err);
    return null;
  }
}

/**
 * Get rate limit status message for UI display
 */
export function getRateLimitStatusMessage(): string | null {
  if (!rateLimitInfo) return null;

  const { remaining, limit, resetAt } = rateLimitInfo;
  const percent = Math.round((remaining / limit) * 100);

  if (remaining === 0) {
    const resetTime = Math.ceil((resetAt.getTime() - Date.now()) / 1000 / 60);
    return `Rate limit exceeded. Resets in ${resetTime} minutes.`;
  }

  if (percent < 20) {
    return `Rate limit warning: ${remaining}/${limit} requests remaining`;
  }

  return null;
}
