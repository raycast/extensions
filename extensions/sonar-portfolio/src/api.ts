import { getPreferenceValues, Cache } from "@raycast/api";
import type {
  Position,
  Account,
  DeepDiveData,
  PulseData,
  SearchResult,
  Quote,
} from "./types";

const cache = new Cache();

function getPrefs() {
  return getPreferenceValues<Preferences>();
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const { apiToken, baseUrl } = getPrefs();
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    throw new Error(
      "Invalid API token — generate a new one in Sonar Settings → Connections → Raycast",
    );
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    const entry = cache.get(key);
    if (entry) {
      try {
        const { data, ts } = JSON.parse(entry);
        if (Date.now() - ts < ttlMs) return data as T;
      } catch {
        // stale cache, refetch
      }
    }
    const data = await fetcher();
    cache.set(key, JSON.stringify({ data, ts: Date.now() }));
    return data;
  };
}

const ONE_MIN = 60_000;
const FIVE_MIN = 5 * ONE_MIN;
const TEN_MIN = 10 * ONE_MIN;

export const api = {
  positions: cached<Position[]>("positions", ONE_MIN, () =>
    fetchApi("/api/positions"),
  ),
  deepdive: cached<DeepDiveData>("deepdive", FIVE_MIN, () =>
    fetchApi("/api/deepdive"),
  ),
  pulse: async (): Promise<PulseData> => {
    const data = await fetchApi<PulseData>("/api/pulse");
    return data;
  },
  generatePulse: () => fetchApi<PulseData>("/api/pulse", { method: "POST" }),
  accounts: cached<Account[]>("accounts", TEN_MIN, () =>
    fetchApi("/api/accounts"),
  ),
  search: (q: string) =>
    fetchApi<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  quote: (symbol: string) =>
    fetchApi<Quote>(`/api/quotes/${encodeURIComponent(symbol)}`),
};
