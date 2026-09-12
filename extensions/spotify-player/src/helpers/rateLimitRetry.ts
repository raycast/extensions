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

    const response = await fetchFn(url, init);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 1;
      const waitMs = (isNaN(waitSeconds) ? 1 : waitSeconds) * 1000;

      // Set global rate limit so other concurrent requests also wait
      rateLimitedUntil = Date.now() + waitMs;
      await new Promise((resolve) => setTimeout(resolve, waitMs));

      // Retry once after honouring the Retry-After window
      return fetchFn(url, init);
    }

    return response;
  };
}
