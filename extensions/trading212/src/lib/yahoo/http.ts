/** A Yahoo request that hasn't answered by then is treated as failed. */
export const YAHOO_TIMEOUT_MS = 8000;

export class YahooHttpError extends Error {
  constructor(readonly status: number) {
    super(`Yahoo request failed with status ${status}`);
    this.name = "YahooHttpError";
  }
}

/** GET a Yahoo Finance JSON endpoint. Yahoo rejects requests without a browser-like User-Agent. */
export async function yahooJson(url: string, fetchFn: typeof fetch, timeoutMs: number): Promise<unknown> {
  const res = await fetchFn(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new YahooHttpError(res.status);
  return res.json();
}
