import { Cache } from "@raycast/api";
import { getGuestToken, GuestToken } from "./migrosApi";

const cache = new Cache();
const TOKEN_KEY = "migros_token";

// Token TTL: 20 hours (conservative, tokens observed to expire in 1-2 days)
const TOKEN_TTL_MS = 20 * 60 * 60 * 1000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Get a valid token from cache or fetch a new one.
 * This is the primary way to get a token for API calls.
 */
export async function getValidToken(): Promise<string> {
  const cached = cache.get(TOKEN_KEY);
  if (cached) {
    try {
      const data: CachedToken = JSON.parse(cached);
      if (Date.now() < data.expiresAt) {
        return data.token;
      }
      // Token expired, fall through to refresh
    } catch {
      // Invalid cache data, fall through to refresh
    }
  }

  return await refreshToken();
}

/**
 * Force refresh the token and update cache.
 */
export async function refreshToken(): Promise<string> {
  const tokenResult: GuestToken = await getGuestToken();
  const token = tokenResult.token;

  if (token) {
    const cachedToken: CachedToken = {
      token,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    };
    cache.set(TOKEN_KEY, JSON.stringify(cachedToken));
  }

  return token;
}

/**
 * Clear the cached token.
 */
export function clearToken(): void {
  cache.remove(TOKEN_KEY);
}

/**
 * Wrapper that automatically handles token refresh on 401/403 errors.
 * Use this for all API calls that require authentication.
 *
 * @param apiCall - Function that makes an API call with a token
 * @returns The result of the API call
 */
export async function withValidToken<T>(apiCall: (token: string) => Promise<T>): Promise<T> {
  let token = await getValidToken();

  try {
    return await apiCall(token);
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown } };
    console.error("[withValidToken] API call failed", {
      error: err,
      status: err.response?.status,
      data: err.response?.data,
    });
    if (err.response?.status === 401 || err.response?.status === 403) {
      clearToken();
      token = await refreshToken();
      return await apiCall(token);
    }
    throw error;
  }
}
