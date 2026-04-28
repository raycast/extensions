import { getPreferenceValues, Cache } from "@raycast/api";

type Preferences = {
  apiKey: string;
  defaultFrom?: string;
  defaultTo?: string;
  cacheMinutes?: string;
};

type LatestResponse = {
  data: Record<string, number>;
};

const cache = new Cache();
const BASE_URL = "https://api.freecurrencyapi.com/v1/latest";

export function getPrefs(): Required<Pick<Preferences, "apiKey">> & {
  defaultFrom: string;
  defaultTo: string;
  cacheMinutes: number;
} {
  const prefs = getPreferenceValues<Preferences>();
  const cacheMinutes = Number.parseInt(prefs.cacheMinutes ?? "30", 10);
  return {
    apiKey: prefs.apiKey,
    defaultFrom: (prefs.defaultFrom || "USD").toUpperCase(),
    defaultTo: (prefs.defaultTo || "BRL").toUpperCase(),
    cacheMinutes: Number.isFinite(cacheMinutes) && cacheMinutes >= 0 ? cacheMinutes : 30,
  };
}

type CachedRates = {
  fetchedAt: number;
  base: string;
  rates: Record<string, number>;
};

export class MissingApiKeyError extends Error {
  constructor() {
    super("Missing API key. Open the extension preferences to add your free key from freecurrencyapi.com.");
    this.name = "MissingApiKeyError";
  }
}

export class InvalidApiKeyError extends Error {
  constructor() {
    super("Invalid API key. Check it in the extension preferences.");
    this.name = "InvalidApiKeyError";
  }
}

export async function getRates(base: string): Promise<CachedRates> {
  const { apiKey, cacheMinutes } = getPrefs();
  if (!apiKey || !apiKey.trim()) {
    throw new MissingApiKeyError();
  }
  const key = `rates:${base.toUpperCase()}`;
  const ttlMs = cacheMinutes * 60 * 1000;

  const cached = cache.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as CachedRates;
      if (Date.now() - parsed.fetchedAt < ttlMs) {
        return parsed;
      }
    } catch {
      // fall through and refetch
    }
  }

  const url = `${BASE_URL}?apikey=${encodeURIComponent(apiKey)}&base_currency=${encodeURIComponent(base.toUpperCase())}`;
  const response = await fetch(url);
  if (response.status === 401 || response.status === 403) {
    throw new InvalidApiKeyError();
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${text || response.statusText}`);
  }
  const json = (await response.json()) as LatestResponse;
  if (!json?.data || typeof json.data !== "object") {
    throw new Error("Unexpected response shape from freecurrencyapi");
  }

  const fresh: CachedRates = {
    fetchedAt: Date.now(),
    base: base.toUpperCase(),
    rates: json.data,
  };
  cache.set(key, JSON.stringify(fresh));
  return fresh;
}

export function convert(amount: number, rate: number): number {
  return amount * rate;
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
