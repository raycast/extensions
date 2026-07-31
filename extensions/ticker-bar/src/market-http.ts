const REQUEST_TIMEOUT_MS = 5000;
const USER_AGENT = "Raycast-TickerBar/1.0 (+https://www.raycast.com)";

export class MarketRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "MarketRequestError";
  }
}

export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await request(url, "application/json", signal);
  try {
    return (await response.json()) as T;
  } catch {
    throw new MarketRequestError(`Invalid JSON response: ${url}`);
  }
}

export async function request(
  url: string,
  accept?: string,
  signal?: AbortSignal,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: signal
          ? AbortSignal.any([controller.signal, signal])
          : controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          ...(accept ? { accept } : {}),
        },
      });
      if (response.ok) return response;

      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = retryAfter
        ? Math.max(0, Number(retryAfter) * 1000)
        : undefined;
      const error = new MarketRequestError(
        `${response.status} ${response.statusText}`,
        response.status,
        retryAfterMs,
      );
      if (response.status === 429 || response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      if (signal?.aborted) throw new MarketRequestError("Request cancelled");
      if (
        error instanceof MarketRequestError &&
        (error.status === 429 || (error.status && error.status < 500))
      ) {
        throw error;
      }
      lastError =
        error instanceof Error && error.name === "AbortError"
          ? new MarketRequestError("Request timed out")
          : error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 0) await delay(250);
  }

  if (lastError instanceof Error) throw lastError;
  throw new MarketRequestError("Request failed");
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
