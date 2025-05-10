import axios, { AxiosRequestConfig } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { getPreferences } from "./utils";
import React from "react";

const BASE_URL = "https://pro-api.coinmarketcap.com/v1";

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

interface CoinMapEntry {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  // Add other fields if they exist and are used
}

export function getCoinMarketCapApiKey(): string {
  const preferences = getPreferenceValues();
  const apiKey = preferences.coinmarketcapApiKey as string;
  return apiKey;
}

// Shared utility function for API key check
function ensureApiKey(): boolean {
  const apiKey = getCoinMarketCapApiKey();
  if (!apiKey) {
    showFailureToast("API Key Missing", {
      message: "Please set your CoinMarketCap API key in preferences.",
    });
    return false;
  }
  return true;
}

const coinMarketCapAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

coinMarketCapAPI.interceptors.request.use(
  (config) => {
    const apiKey = getCoinMarketCapApiKey();
    if (!apiKey) {
      // The ensureApiKey check in hooks will show the toast,
      // but we still throw here to stop the request chain in case
      // the check is missed elsewhere.
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

coinMarketCapAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    // If it's a cancellation, don't show a toast or transform the error
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    let customError = error; // Default to original error
    if (error.response) {
      const { status, data } = error.response;
      let title = "CoinMarketCap API Error";
      let message = `CoinMarketCap API Error: ${status}`;

      if (status === 401 || status === 403) {
        title = "Invalid API Key";
        message =
          "Invalid API key. Please check your CoinMarketCap API key in preferences.";
        customError = new Error(message);
      } else if (status === 429) {
        title = "Rate Limit Exceeded";
        message =
          "CoinMarketCap API rate limit exceeded. Please try again later.";
        customError = new Error(message);
      } else if (data && data.status && data.status.error_message) {
        message = `CoinMarketCap API error: ${data.status.error_message}`;
        customError = new Error(message);
      }
      showFailureToast(customError.message, { title });
    } else if (error.request) {
      // The request was made but no response was received
      const title = "Network Error";
      const message =
        "Could not connect to CoinMarketCap API. Check your internet connection.";
      customError = new Error(message);
      showFailureToast(message, { title });
    } else {
      // Something happened in setting up the request that triggered an Error
      const title = "Request Setup Error";
      customError = new Error(error.message || "An unexpected error occurred.");
      showFailureToast(customError.message, { title });
    }
    return Promise.reject(customError);
  },
);

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
      console.log("Request for top coins was canceled");
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
      console.log("Request for coin details was canceled");
      // Return an empty object with the required structure instead of throwing
      return {
        id: parseInt(coinId),
        name: "",
        symbol: "",
        slug: "",
        description: "",
        logo: "",
        urls: {
          website: [],
          technical_doc: [],
          twitter: [],
          reddit: [],
          message_board: [],
          announcement: [],
          chat: [],
          explorer: [],
          source_code: [],
        },
        date_added: "",
        tags: [],
        platform: null,
        category: "",
        cmc_rank: 0,
        circulating_supply: 0,
        total_supply: 0,
        max_supply: null,
        last_updated: "",
        quote: {},
      };
    }
    console.error("Error fetching details for coin", coinId, ":", error);
    throw error;
  }
}

export async function getMarketChart(
  coinId: string,
  days = 7,
  vsCurrency: string,
  signal?: AbortSignal,
): Promise<MarketChart> {
  try {
    // Note: CoinMarketCap API v1 does not provide historical market chart data directly
    // This function simulates a market chart based on current price and 7-day change.
    // For real historical data, a different API (like CoinGecko) would be needed or potentially CMC's premium endpoints.

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
    const startPrice = currentPrice / (1 + percentChange7d / 100); // Estimate start price

    // Simple spline interpolation parameters
    const dataPoints = 50; // Number of points in the chart
    const interval = (now - startTime) / dataPoints; // Time between points

    const prices: [number, number][] = [];
    const marketCaps: [number, number][] = []; // Simulated market caps
    const volumes: [number, number][] = []; // Simulated volumes

    // Use Catmull-Rom Spline to create a smoother line
    // Control points for the spline
    const volatility = Math.min(Math.abs(percentChange24h) / 15 + 0.3, 1.0); // Scale volatility
    const numControlPoints = 8; // More control points for smoother curve
    const controlPoints: number[] = [];

    controlPoints.push(startPrice); // Start at estimated past price

    for (let i = 1; i < numControlPoints - 1; i++) {
      const progress = i / (numControlPoints - 1);
      // Base price linearly interpolated between start and current
      const basePrice = startPrice + (currentPrice - startPrice) * progress;
      // Add some random deviation, larger near the ends
      const maxDeviation = basePrice * 0.05 * volatility; // Deviation scales with price and volatility
      const deviation = (Math.random() * 2 - 1) * maxDeviation;
      // Apply a factor to make deviation smaller in the middle and larger at ends (like a bell curve inverted)
      const edgeFactor = 1 - Math.pow(2 * progress - 1, 2); // Peaks at start/end, zero in middle
      const adjustedDeviation = deviation * edgeFactor;

      controlPoints.push(basePrice + adjustedDeviation);
    }
    controlPoints.push(currentPrice); // End at current price

    // Generate spline points
    for (let i = 0; i <= dataPoints; i++) {
      const timestamp = startTime + i * interval;
      const progress = i / dataPoints;

      // Find the segment for the current progress
      const segment = Math.min(
        Math.floor(progress * (numControlPoints - 1)),
        numControlPoints - 2,
      );
      const segmentProgress = progress * (numControlPoints - 1) - segment;

      // Get the 4 control points for the current segment
      const p0 =
        segment > 0 ? controlPoints[segment - 1] : controlPoints[segment];
      const p1 = controlPoints[segment];
      const p2 = controlPoints[segment + 1];
      const p3 =
        segment < numControlPoints - 2
          ? controlPoints[segment + 2]
          : controlPoints[segment + 1];

      // Catmull-Rom Spline interpolation
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

      // Simulate market cap and volume proportionally to price with some noise
      const marketCap = price * coinData.circulating_supply; // Simple proportionality
      marketCaps.push([timestamp, marketCap]);

      // Simulate volume - higher volume on days with larger price swings
      let volumeFactor = 0.7 + 0.6 * Math.random(); // Base randomness
      if (i > 0) {
        const lastPrice = prices[i - 1][1];
        const priceChange = Math.abs(price - lastPrice) / lastPrice;
        if (priceChange > 0.01) {
          // Spike volume on significant price moves
          volumeFactor *= 1 + priceChange * 10; // Factor increases with price change
        }
      }
      const volume =
        coinData.quote[vsCurrency.toUpperCase()].volume_24h * volumeFactor; // Scale based on current 24h volume
      volumes.push([timestamp, volume]);
    }

    // Ensure the last point is exactly the current price and time
    if (prices.length > 0) {
      prices[prices.length - 1] = [now, currentPrice];
      marketCaps[marketCaps.length - 1] = [
        now,
        currentPrice * coinData.circulating_supply,
      ];
      // Volume at the last point is less critical, use the simulated one or current 24h avg
      // Keeping the simulated one for curve consistency or set to current 24h volume if preferred
      volumes[volumes.length - 1] = [
        now,
        coinData.quote[vsCurrency.toUpperCase()].volume_24h,
      ];
    }

    return {
      prices,
      market_caps: marketCaps,
      total_volumes: volumes,
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("Request for market chart was canceled");
      return {
        prices: [],
        market_caps: [],
        total_volumes: [],
      };
    }
    console.error("Error generating market chart for coin", coinId, ":", error);
    throw error;
  }
}

export async function searchCoins(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  try {
    const config: AxiosRequestConfig = {
      params: {
        limit: 100, // Fetch a reasonable number of top coins to search within
        sort: "cmc_rank",
      },
    };
    if (signal) {
      config.signal = signal;
    }

    const response = await coinMarketCapAPI.get("/cryptocurrency/map", config);
    const allCoins: CoinMapEntry[] = response.data.data;

    const lowercaseQuery = query.toLowerCase();

    const filteredCoins = allCoins.filter(
      (coin: CoinMapEntry) =>
        coin.name.toLowerCase().includes(lowercaseQuery) ||
        coin.symbol.toLowerCase().includes(lowercaseQuery),
    );

    const uniqueCoinsMap = new Map<number, SearchResult>();
    filteredCoins.forEach((coin: CoinMapEntry) => {
      const uniqueKey = coin.id;
      if (
        !uniqueCoinsMap.has(uniqueKey) ||
        (uniqueCoinsMap.get(uniqueKey)?.rank ?? Infinity) > coin.rank // Handle potential undefined rank
      ) {
        uniqueCoinsMap.set(uniqueKey, {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          slug: coin.slug,
          rank: coin.rank,
          logo: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`, // Populate logo here
        });
      }
    });

    return Array.from(uniqueCoinsMap.values());
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("Request for searching coins was canceled");
      return [];
    }
    console.error("Error searching for coins with query", query, ":", error);
    throw error;
  }
}

// React hooks for cached data

export function useTopCoins(perPageArg = 50) {
  const { vsCurrency, refreshInterval } = getPreferences();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // API Key Check
  React.useEffect(() => {
    ensureApiKey();
  }, []); // Check once on mount

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (currency: string, count: number) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      return getTopCoins(currency, count, abortControllerRef.current.signal);
    },
    [vsCurrency, perPageArg],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  React.useEffect(() => {
    if (refreshInterval && revalidate) {
      const intervalId = setInterval(
        () => {
          revalidate();
        },
        refreshInterval * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, revalidate]); // Added revalidate

  return { data, isLoading, error, revalidate };
}

export function useCoinDetails(id: string) {
  const { vsCurrency, refreshInterval } = getPreferences();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // API Key Check
  React.useEffect(() => {
    ensureApiKey();
  }, []); // Check once on mount

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

  React.useEffect(() => {
    if (refreshInterval && revalidate) {
      const intervalId = setInterval(
        () => {
          revalidate();
        },
        refreshInterval * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, revalidate]); // Added revalidate

  return { data, isLoading, error, revalidate };
}

export function useMarketChart(id: string, daysArg = 7) {
  const { vsCurrency, refreshInterval } = getPreferences();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // API Key Check
  React.useEffect(() => {
    ensureApiKey();
  }, []); // Check once on mount

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

  React.useEffect(() => {
    if (refreshInterval && revalidate) {
      const intervalId = setInterval(
        () => {
          revalidate();
        },
        refreshInterval * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, revalidate]); // Added revalidate

  return { data, isLoading, error, revalidate };
}

export function useSearchCoins(query: string) {
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // API Key Check
  React.useEffect(() => {
    ensureApiKey();
  }, []); // Check once on mount

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
