export const COINPAPRIKA_TICKER_URL =
  "https://api.coinpaprika.com/v1/tickers/bsv-bitcoin-sv";
export const WHATSONCHAIN_INFO_URL =
  "https://api.whatsonchain.com/v1/bsv/main/chain/info";
export const COINPAPRIKA_BSV_URL =
  "https://coinpaprika.com/coin/bsv-bitcoin-sv/";

const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 250;

export interface MarketSnapshot {
  priceUsd: number;
  percentChange24h: number;
  volume24hUsd: number;
  marketCapUsd: number;
  blockHeight?: number;
  updatedAt: string;
}

export interface MarketState {
  snapshot?: MarketSnapshot;
  isStale: boolean;
  error?: string;
}

interface CoinPaprikaTicker {
  last_updated?: unknown;
  quotes?: {
    USD?: {
      price?: unknown;
      percent_change_24h?: unknown;
      volume_24h?: unknown;
      market_cap?: unknown;
    };
  };
}

interface ChainInfo {
  blocks?: unknown;
}

type Fetcher = typeof fetch;

function finiteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Market response has an invalid ${fieldName}.`);
  }
  return value;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(
  url: string,
  fetcher: Fetcher,
  attempts = 2,
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}.`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(RETRY_DELAY_MS);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Market request failed.");
}

export async function fetchMarketSnapshot(
  fetcher: Fetcher = fetch,
): Promise<MarketSnapshot> {
  const [tickerResult, chainResult] = await Promise.allSettled([
    fetchJson(COINPAPRIKA_TICKER_URL, fetcher),
    fetchJson(WHATSONCHAIN_INFO_URL, fetcher),
  ]);

  if (tickerResult.status === "rejected") {
    throw tickerResult.reason;
  }

  const ticker = tickerResult.value as CoinPaprikaTicker;
  const usd = ticker.quotes?.USD;
  const updatedAt =
    typeof ticker.last_updated === "string"
      ? ticker.last_updated
      : new Date().toISOString();
  const parsedUpdatedAt = new Date(updatedAt);

  if (!usd || Number.isNaN(parsedUpdatedAt.getTime())) {
    throw new Error("Market response is missing required ticker data.");
  }

  let blockHeight: number | undefined;
  if (chainResult.status === "fulfilled") {
    const blocks = (chainResult.value as ChainInfo).blocks;
    if (
      typeof blocks === "number" &&
      Number.isSafeInteger(blocks) &&
      blocks >= 0
    ) {
      blockHeight = blocks;
    }
  }

  return {
    priceUsd: finiteNumber(usd.price, "price"),
    percentChange24h: finiteNumber(usd.percent_change_24h, "24-hour change"),
    volume24hUsd: finiteNumber(usd.volume_24h, "24-hour volume"),
    marketCapUsd: finiteNumber(usd.market_cap, "market cap"),
    blockHeight,
    updatedAt: parsedUpdatedAt.toISOString(),
  };
}

export function parseCachedSnapshot(
  value: string | undefined,
): MarketSnapshot | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const snapshot = JSON.parse(value) as Partial<MarketSnapshot>;
    if (
      typeof snapshot.priceUsd !== "number" ||
      !Number.isFinite(snapshot.priceUsd) ||
      typeof snapshot.percentChange24h !== "number" ||
      !Number.isFinite(snapshot.percentChange24h) ||
      typeof snapshot.volume24hUsd !== "number" ||
      !Number.isFinite(snapshot.volume24hUsd) ||
      typeof snapshot.marketCapUsd !== "number" ||
      !Number.isFinite(snapshot.marketCapUsd) ||
      typeof snapshot.updatedAt !== "string" ||
      Number.isNaN(new Date(snapshot.updatedAt).getTime()) ||
      (snapshot.blockHeight !== undefined &&
        (typeof snapshot.blockHeight !== "number" ||
          !Number.isSafeInteger(snapshot.blockHeight)))
    ) {
      return undefined;
    }

    return snapshot as MarketSnapshot;
  } catch {
    return undefined;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Market data is temporarily unavailable.";
}

export async function resolveMarketState(
  cachedValue: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<MarketState> {
  const cachedSnapshot = parseCachedSnapshot(cachedValue);

  try {
    return { snapshot: await fetchMarketSnapshot(fetcher), isStale: false };
  } catch (error) {
    return {
      snapshot: cachedSnapshot,
      isStale: true,
      error: errorMessage(error),
    };
  }
}
