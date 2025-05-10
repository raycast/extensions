import axios, { AxiosRequestConfig } from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPreferences } from "./utils";
import React from "react";

const BASE_URL = "https://pro-api.coinmarketcap.com/v1";

// Define interfaces for API responses
export interface Coin {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
  date_added: string;
  quote: {
    [key: string]: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
  tags: string[];
}

export interface CoinDetail {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  description: string;
  logo: string;
  urls: {
    website: string[];
    technical_doc: string[];
    twitter: string[];
    reddit: string[];
    message_board: string[];
    announcement: string[];
    chat: string[];
    explorer: string[];
    source_code: string[];
  };
  date_added: string;
  tags: string[];
  platform: null;
  category: string;
  cmc_rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
  quote: {
    [key: string]: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
}

export interface MarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface SearchResult {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  logo: string;
}

// Preference utilities
export function getCoinMarketCapApiKey(): string {
  const preferences = getPreferenceValues();
  const apiKey = preferences.coinmarketcapApiKey as string;
  return apiKey;
}

// Create axios instance
const coinMarketCapAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Add request interceptor to add API key to all requests
coinMarketCapAPI.interceptors.request.use(
  (config) => {
    const apiKey = getCoinMarketCapApiKey();
    if (!apiKey) {
      throw new Error(
        "CoinMarketCap API key is not set. Please set it in preferences.",
      );
    }
    config.headers["X-CMC_PRO_API_KEY"] = apiKey;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle API errors
coinMarketCapAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401 || status === 403) {
        return Promise.reject(
          new Error(
            "Invalid API key. Please check your CoinMarketCap API key in preferences.",
          ),
        );
      } else if (status === 429) {
        return Promise.reject(
          new Error(
            "CoinMarketCap API rate limit exceeded. Please try again later.",
          ),
        );
      } else if (data && data.status && data.status.error_message) {
        return Promise.reject(
          new Error(`CoinMarketCap API error: ${data.status.error_message}`),
        );
      }
    }
    return Promise.reject(error);
  },
);

// API functions with optimized error handling
export async function getTopCoins(
  vsCurrency: string,
  perPage = 50,
  signal?: AbortSignal,
): Promise<Coin[]> {
  try {
    const config: AxiosRequestConfig = {
      params: {
        limit: perPage,
        convert: vsCurrency.toUpperCase(),
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response = await coinMarketCapAPI.get(
      "/cryptocurrency/listings/latest",
      config,
    );
    return response.data.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("Request was canceled");
      return [];
    }
    console.error("Error fetching top coins:", error);
    throw error;
  }
}

export async function getCoinDetails(
  coinId: string,
  vsCurrency: string,
  signal?: AbortSignal,
): Promise<CoinDetail> {
  try {
    const metadataConfig: AxiosRequestConfig = {
      params: {
        id: coinId,
      },
    };

    const quotesConfig: AxiosRequestConfig = {
      params: {
        id: coinId,
        convert: vsCurrency.toUpperCase(),
      },
    };

    if (signal) {
      metadataConfig.signal = signal;
      quotesConfig.signal = signal;
    }

    const metadataResponse = await coinMarketCapAPI.get(
      "/cryptocurrency/info",
      metadataConfig,
    );
    const quotesResponse = await coinMarketCapAPI.get(
      "/cryptocurrency/quotes/latest",
      quotesConfig,
    );

    const metadata = metadataResponse.data.data[coinId];
    const quotesData = quotesResponse.data.data[coinId];

    return {
      ...metadata,
      ...quotesData,
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log(`Request for coin ${coinId} was canceled`);
      throw new Error("Request was canceled");
    }
    console.error(`Error fetching details for coin ${coinId}:`, error);
    throw error;
  }
}

// We need to generate market chart data using points over time
// Since CoinMarketCap doesn't have a free endpoint for historical data, we'll simulate it
export async function getMarketChart(
  coinId: string,
  days = 7,
  vsCurrency: string,
  signal?: AbortSignal,
): Promise<MarketChart> {
  try {
    const detailsConfig: AxiosRequestConfig = {
      params: {
        id: coinId,
        convert: vsCurrency.toUpperCase(),
      },
    };

    if (signal) {
      detailsConfig.signal = signal;
    }

    const response = await coinMarketCapAPI.get(
      "/cryptocurrency/quotes/latest",
      detailsConfig,
    );
    const coinData = response.data.data[coinId];
    const currentPrice = coinData.quote[vsCurrency.toUpperCase()].price;
    const percentChange7d =
      coinData.quote[vsCurrency.toUpperCase()].percent_change_7d;
    const percentChange24h =
      coinData.quote[vsCurrency.toUpperCase()].percent_change_24h;

    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const startTime = now - days * millisecondsPerDay;

    const startPrice = currentPrice / (1 + percentChange7d / 100);

    const dataPoints = 50;
    const interval = (now - startTime) / dataPoints;

    const prices: [number, number][] = [];
    const marketCaps: [number, number][] = [];
    const volumes: [number, number][] = [];

    const volatility = Math.min(Math.abs(percentChange24h) / 15 + 0.3, 1.0);

    const numControlPoints = 8;
    const controlPoints: number[] = [];

    controlPoints.push(startPrice);

    for (let i = 1; i < numControlPoints - 1; i++) {
      const progress = i / (numControlPoints - 1);
      const basePrice = startPrice + (currentPrice - startPrice) * progress;
      const maxDeviation = basePrice * 0.05 * volatility;
      const deviation = (Math.random() * 2 - 1) * maxDeviation;
      const edgeFactor = 1 - Math.pow(2 * progress - 1, 2);
      const adjustedDeviation = deviation * edgeFactor;
      controlPoints.push(basePrice + adjustedDeviation);
    }

    controlPoints.push(currentPrice);

    for (let i = 0; i <= dataPoints; i++) {
      const timestamp = startTime + i * interval;
      const progress = i / dataPoints;
      const segment = Math.min(
        Math.floor(progress * (numControlPoints - 1)),
        numControlPoints - 2,
      );
      const segmentProgress = progress * (numControlPoints - 1) - segment;

      const p0 =
        segment > 0 ? controlPoints[segment - 1] : controlPoints[segment];
      const p1 = controlPoints[segment];
      const p2 = controlPoints[segment + 1];
      const p3 =
        segment < numControlPoints - 2
          ? controlPoints[segment + 2]
          : controlPoints[segment + 1];

      const t = segmentProgress;
      const t2 = t * t;
      const t3 = t2 * t;

      const price =
        0.5 *
        (2 * p1 +
          (-p0 + p2) * t +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t3);

      prices.push([timestamp, price]);

      const marketCap = price * coinData.circulating_supply;
      marketCaps.push([timestamp, marketCap]);

      let volumeFactor = 0.7 + 0.6 * Math.random();
      if (i > 0) {
        const lastPrice = prices[i - 1][1];
        const priceChange = Math.abs(price - lastPrice) / lastPrice;
        if (priceChange > 0.01) {
          volumeFactor *= 1 + priceChange * 10;
        }
      }

      const volume =
        coinData.quote[vsCurrency.toUpperCase()].volume_24h * volumeFactor;
      volumes.push([timestamp, volume]);
    }

    // Ensure the last price is exactly the current price for consistency
    if (prices.length > 0) {
      prices[prices.length - 1] = [now, currentPrice];
      marketCaps[marketCaps.length - 1] = [
        now,
        currentPrice * coinData.circulating_supply,
      ];
    }

    return {
      prices,
      market_caps: marketCaps,
      total_volumes: volumes,
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log(`Request for market chart ${coinId} was canceled`);
      throw new Error("Request was canceled");
    }
    console.error(`Error generating market chart for coin ${coinId}:`, error);
    throw error;
  }
}

export async function searchCoins(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  try {
    // Since CoinMarketCap doesn't have a free search endpoint, we'll fetch all coins and filter
    const config: AxiosRequestConfig = {
      params: {
        limit: 100, // Fetch top 100 coins
        sort: "cmc_rank",
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response = await coinMarketCapAPI.get("/cryptocurrency/map", config);
    const allCoins = response.data.data;

    // Filter coins based on search query
    const lowercaseQuery = query.toLowerCase();
    const filteredCoins = allCoins.filter(
      (coin: any) =>
        coin.name.toLowerCase().includes(lowercaseQuery) ||
        coin.symbol.toLowerCase().includes(lowercaseQuery),
    );

    // Create a Map to handle duplicate IDs
    const uniqueCoinsMap = new Map();

    // Process coins to ensure unique keys
    filteredCoins.forEach((coin: any) => {
      // Create a unique key using both id and symbol
      const uniqueKey = coin.id;

      // Only add if not already in the map or if it has a higher rank
      if (
        !uniqueCoinsMap.has(uniqueKey) ||
        uniqueCoinsMap.get(uniqueKey).rank > coin.rank
      ) {
        uniqueCoinsMap.set(uniqueKey, {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          slug: coin.slug,
          rank: coin.rank,
          logo: "", // CoinMarketCap doesn't provide logo in map endpoint
        });
      }
    });

    // Convert Map values to array
    return Array.from(uniqueCoinsMap.values());
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log(`Search request for ${query} was canceled`);
      return [];
    }
    console.error(`Error searching for coins with query ${query}:`, error);
    throw error;
  }
}

// React hooks for cached data
export function useTopCoins(perPageArg = 50) {
  const { vsCurrency, refreshInterval } = getPreferences();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Check if API key exists
  const apiKey = getCoinMarketCapApiKey();
  if (!apiKey) {
    showToast({
      style: Toast.Style.Failure,
      title: "API Key Missing",
      message: "Please set your CoinMarketCap API key in preferences.",
    });
  }

  React.useEffect(() => {
    // Set up refresh interval manually
    if (refreshInterval) {
      const intervalId = setInterval(
        () => {
          if (revalidate) revalidate();
        },
        refreshInterval * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);

  // useCachedPromise expects the function itself, then its arguments as an array
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (currency: string, count: number) => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new AbortController
      abortControllerRef.current = new AbortController();

      return getTopCoins(currency, count, abortControllerRef.current.signal);
    },
    [vsCurrency, perPageArg],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { data, isLoading, error, revalidate };
}

export function useCoinDetails(id: string) {
  const { vsCurrency, refreshInterval } = getPreferences();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Check if API key exists
  const apiKey = getCoinMarketCapApiKey();
  if (!apiKey) {
    showToast({
      style: Toast.Style.Failure,
      title: "API Key Missing",
      message: "Please set your CoinMarketCap API key in preferences.",
    });
  }

  React.useEffect(() => {
    // Set up refresh interval manually
    if (refreshInterval) {
      const intervalId = setInterval(
        () => {
          if (revalidate) revalidate();
        },
        refreshInterval * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (coinId: string, currency: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      return getCoinDetails(
        coinId,
        currency,
        abortControllerRef.current.signal,
      );
    },
    [id, vsCurrency],
    {
      keepPreviousData: true,
    },
  );

  return { data, isLoading, error, revalidate };
}

export function useMarketChart(id: string, daysArg = 7) {
  const { vsCurrency, refreshInterval } = getPreferences();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Check if API key exists
  const apiKey = getCoinMarketCapApiKey();
  if (!apiKey) {
    showToast({
      style: Toast.Style.Failure,
      title: "API Key Missing",
      message: "Please set your CoinMarketCap API key in preferences.",
    });
  }

  React.useEffect(() => {
    // Set up refresh interval manually
    if (refreshInterval) {
      const intervalId = setInterval(
        () => {
          if (revalidate) revalidate();
        },
        refreshInterval * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (coinId: string, days: number, currency: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      return getMarketChart(
        coinId,
        days,
        currency,
        abortControllerRef.current.signal,
      );
    },
    [id, daysArg, vsCurrency],
    {
      keepPreviousData: true,
    },
  );

  return { data, isLoading, error, revalidate };
}

export function useSearchCoins(query: string) {
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Check if API key exists
  const apiKey = getCoinMarketCapApiKey();
  if (!apiKey) {
    showToast({
      style: Toast.Style.Failure,
      title: "API Key Missing",
      message: "Please set your CoinMarketCap API key in preferences.",
    });
  }

  return useCachedPromise(
    (searchQuery: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      return searchCoins(searchQuery, abortControllerRef.current.signal);
    },
    [query],
    {
      keepPreviousData: true,
    },
  );
}
