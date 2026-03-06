import retry from "async-retry";

type FetchFn = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function withRateLimitRetry(fetchFn: FetchFn): FetchFn {
  return async (url, init) => {
    return retry(
      async () => {
        const response = await fetchFn(url, init);

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 1;
          const waitMs = (isNaN(waitSeconds) ? 1 : waitSeconds) * 1000;

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
