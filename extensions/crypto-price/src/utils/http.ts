const DEFAULT_TIMEOUT_MS = 8000;

type JsonInit = RequestInit & { timeoutMs?: number };

/** GET + parse JSON with a hard timeout. Throws on network error, timeout, or non-2xx. */
export async function httpJson<T>(url: string, init: JsonInit = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      // Some exchanges (e.g. Coinbase) reject requests without a User-Agent.
      "User-Agent": "Raycast-CryptoPrice",
      Accept: "application/json",
      ...headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} (${new URL(url).host})`);
  }
  return (await res.json()) as T;
}
