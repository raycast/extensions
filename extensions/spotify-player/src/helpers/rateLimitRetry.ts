import { showHUD } from "@raycast/api";
import retry from "async-retry";

type FetchFn = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

// Global rate limit state shared across all requests.
// When one request hits 429, all subsequent requests wait until the window expires
// instead of each independently hitting the limit and retrying.
let rateLimitedUntil = 0;

export function withRateLimitRetry(fetchFn: FetchFn): FetchFn {
  return async (url, init) => {
    // If we're globally rate limited, wait before even trying
    const now = Date.now();
    if (rateLimitedUntil > now) {
      const waitMs = rateLimitedUntil - now;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return retry(
      async () => {
        const response = await fetchFn(url, init);

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const baseSeconds = retryAfter ? parseInt(retryAfter, 10) : 1;
          // Add 2s buffer to avoid hitting the limit again immediately after retry
          const waitSeconds = (isNaN(baseSeconds) ? 1 : baseSeconds) + 2;
          const waitMs = waitSeconds * 1000;

          // Set global rate limit so other concurrent requests also wait
          rateLimitedUntil = Date.now() + waitMs;

          showHUD(`Spotify rate limited — retrying in ${waitSeconds}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          throw new Error(`Rate limited, retrying after ${waitSeconds}s`);
        }

        // Don't retry other errors — let oazapfts handle them
        return response;
      },
      {
        retries: 2,
        // We handle our own delays via Retry-After, so keep these minimal
        minTimeout: 0,
        maxTimeout: 0,
        onRetry: (err, attempt) => {
          const message = err instanceof Error ? err.message : String(err);
          console.log(`Rate limit retry attempt ${attempt}: ${message}`);
        },
      },
    );
  };
}
