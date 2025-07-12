import { isAuthError } from "./getError";
import { setSpotifyClient } from "./withSpotifyClient";

/**
 * Wrapper that automatically retries API calls with re-authentication on auth errors
 */
export async function withRetry<T>(apiCall: () => Promise<T>, maxRetries: number = 1): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Only retry on auth errors and if we haven't exhausted retries
      if (isAuthError(error) && attempt < maxRetries) {
        console.log(`Authentication failed, attempting to re-authenticate (attempt ${attempt + 1}/${maxRetries + 1})`);

        try {
          // Force re-authentication by calling setSpotifyClient which will get a fresh token
          await setSpotifyClient();

          // Continue to next iteration to retry the API call
          continue;
        } catch (authError) {
          console.error("Re-authentication failed:", authError);
          throw error; // Throw the original error if re-auth fails
        }
      }

      // If it's not an auth error or we've exhausted retries, throw the error
      throw error;
    }
  }

  throw lastError;
}

/**
 * Higher-order function that wraps API functions with retry logic
 */
export function withAutoRetry<TArgs extends unknown[], TReturn>(
  apiFunction: (...args: TArgs) => Promise<TReturn>,
  maxRetries: number = 1,
) {
  return async (...args: TArgs): Promise<TReturn> => {
    return withRetry(() => apiFunction(...args), maxRetries);
  };
}
