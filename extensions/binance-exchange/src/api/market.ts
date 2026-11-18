import { Cache } from "@raycast/api";
import { Ticker24hr, TickerPrice } from "../types";
import { COINM_FUTURES_BASE_URL, publicRequest, SPOT_BASE_URL, USDM_FUTURES_BASE_URL } from "./client";

// Persistent cache for precision data (24h TTL)
const precisionCache = new Cache();
const PRECISION_CACHE_KEY = "precision-data";
const PRECISION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

export interface PrecisionCacheData {
  timestamp: number;
  pricePrecision: Record<string, number>; // symbol -> decimals (e.g., BTCUSDT -> 2)
  assetPrecision: Record<string, number>; // asset -> decimals (e.g., BTC -> 8)
  symbolQuoteAsset: Record<string, string>; // symbol -> quoteAsset (e.g., BTCUSDT -> USDT)
}

/**
 * Get precision from tickSize string (e.g., "0.00000001" -> 8)
 */
function getPrecisionFromTickSize(tickSize: string): number {
  if (!tickSize || tickSize === "0") return 8;
  const parts = tickSize.split(".");
  if (parts.length < 2) return 0;
  const decimals = parts[1];
  const oneIndex = decimals.indexOf("1");
  return oneIndex >= 0 ? oneIndex + 1 : decimals.length;
}

/**
 * Fetch and cache precision data from exchangeInfo (Spot + Futures)
 * Returns both price precision (per symbol) and asset precision (per asset)
 */
async function fetchAndCachePrecisionData(): Promise<PrecisionCacheData> {
  interface ExchangeInfoSymbol {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision: number;
    quotePrecision: number;
    pricePrecision?: number; // Futures have this directly
    filters: { filterType: string; tickSize?: string }[];
  }
  interface ExchangeInfoResponse {
    symbols: ExchangeInfoSymbol[];
  }

  const pricePrecision: Record<string, number> = {};
  const assetPrecision: Record<string, number> = {};
  const symbolQuoteAsset: Record<string, string> = {};

  // Fetch Spot exchangeInfo
  const spotExchangeInfo = await publicRequest<ExchangeInfoResponse>(SPOT_BASE_URL, "/api/v3/exchangeInfo");

  for (const symbol of spotExchangeInfo.symbols) {
    // Price precision from PRICE_FILTER tickSize
    const priceFilter = symbol.filters.find((f) => f.filterType === "PRICE_FILTER");
    if (priceFilter?.tickSize) {
      pricePrecision[symbol.symbol] = getPrecisionFromTickSize(priceFilter.tickSize);
    } else {
      pricePrecision[symbol.symbol] = symbol.quotePrecision;
    }

    // Symbol to quote asset mapping
    symbolQuoteAsset[symbol.symbol] = symbol.quoteAsset;

    // Asset precision (use max precision seen for each asset)
    if (!(symbol.baseAsset in assetPrecision) || symbol.baseAssetPrecision > assetPrecision[symbol.baseAsset]) {
      assetPrecision[symbol.baseAsset] = symbol.baseAssetPrecision;
    }
    if (!(symbol.quoteAsset in assetPrecision) || symbol.quotePrecision > assetPrecision[symbol.quoteAsset]) {
      assetPrecision[symbol.quoteAsset] = symbol.quotePrecision;
    }
  }

  // Fetch USD-M Futures exchangeInfo (non-blocking, don't fail if unavailable)
  try {
    const usdmExchangeInfo = await publicRequest<ExchangeInfoResponse>(USDM_FUTURES_BASE_URL, "/fapi/v1/exchangeInfo");
    for (const symbol of usdmExchangeInfo.symbols) {
      // Futures have pricePrecision directly, or use PRICE_FILTER
      if (symbol.pricePrecision !== undefined) {
        pricePrecision[symbol.symbol] = symbol.pricePrecision;
      } else {
        const priceFilter = symbol.filters.find((f) => f.filterType === "PRICE_FILTER");
        if (priceFilter?.tickSize) {
          pricePrecision[symbol.symbol] = getPrecisionFromTickSize(priceFilter.tickSize);
        }
      }
      // Quote asset mapping for USD-M (e.g., BTCUSDT -> USDT, ETHUSDC -> USDC)
      if (symbol.quoteAsset) {
        symbolQuoteAsset[symbol.symbol] = symbol.quoteAsset;
      }
    }
  } catch {
    // Failed to fetch USD-M Futures exchangeInfo - continue without it
  }

  // Fetch COIN-M Futures exchangeInfo (non-blocking, don't fail if unavailable)
  try {
    const coinmExchangeInfo = await publicRequest<ExchangeInfoResponse>(
      COINM_FUTURES_BASE_URL,
      "/dapi/v1/exchangeInfo",
    );
    for (const symbol of coinmExchangeInfo.symbols) {
      // Futures have pricePrecision directly, or use PRICE_FILTER
      if (symbol.pricePrecision !== undefined) {
        pricePrecision[symbol.symbol] = symbol.pricePrecision;
      } else {
        const priceFilter = symbol.filters.find((f) => f.filterType === "PRICE_FILTER");
        if (priceFilter?.tickSize) {
          pricePrecision[symbol.symbol] = getPrecisionFromTickSize(priceFilter.tickSize);
        }
      }
      // Base asset mapping for COIN-M (collateral is the base asset, e.g., ETHUSD_PERP -> ETH)
      if (symbol.baseAsset) {
        symbolQuoteAsset[symbol.symbol] = symbol.baseAsset;
      }
    }
  } catch {
    // Failed to fetch COIN-M Futures exchangeInfo - continue without it
  }

  // Save to persistent cache
  const cacheData: PrecisionCacheData = {
    timestamp: Date.now(),
    pricePrecision,
    assetPrecision,
    symbolQuoteAsset,
  };
  precisionCache.set(PRECISION_CACHE_KEY, JSON.stringify(cacheData));

  return cacheData;
}

/**
 * Get cached precision data, fetching if needed
 */
async function getPrecisionData(): Promise<PrecisionCacheData> {
  const cached = precisionCache.get(PRECISION_CACHE_KEY);
  if (cached) {
    try {
      const data: PrecisionCacheData = JSON.parse(cached);
      // Check if cache is still valid (within TTL)
      if (Date.now() - data.timestamp < PRECISION_CACHE_TTL) {
        return data;
      }
    } catch {
      // Invalid cache, will refetch
    }
  }
  return fetchAndCachePrecisionData();
}

/**
 * Get symbol price precision map (for Market Prices)
 */
async function getSymbolPrecisionMap(): Promise<Map<string, number>> {
  const data = await getPrecisionData();
  return new Map(Object.entries(data.pricePrecision));
}

/**
 * Get precision for a specific asset (for Wallet display)
 * Returns precision from cache, or 8 as default if not found
 */
export async function getAssetPrecision(asset: string): Promise<number> {
  const data = await getPrecisionData();
  return data.assetPrecision[asset] ?? 8;
}

/**
 * Get precision for a specific asset synchronously from cache
 * Returns precision from cache if available, or default (8 for crypto, 2 for stablecoins)
 * Use this when you can't await (e.g., in formatting functions)
 */
export function getAssetPrecisionSync(asset: string): number {
  const cached = precisionCache.get(PRECISION_CACHE_KEY);
  if (cached) {
    try {
      const data: PrecisionCacheData = JSON.parse(cached);
      if (data.assetPrecision[asset] !== undefined) {
        return data.assetPrecision[asset];
      }
    } catch {
      // Invalid cache
    }
  }
  // Fallback when cache is not populated
  return 8;
}

/**
 * Get price precision for a specific trading symbol synchronously from cache
 * Returns precision from cache if available, or default (2 for USD pairs, 8 for others)
 * Use this for formatting prices in wallet positions
 */
export function getPricePrecisionSync(symbol: string): number {
  const cached = precisionCache.get(PRECISION_CACHE_KEY);
  if (cached) {
    try {
      const data: PrecisionCacheData = JSON.parse(cached);
      // Try exact match first (e.g., BTCUSDT, DOGEUSD_PERP)
      if (data.pricePrecision[symbol] !== undefined) {
        return data.pricePrecision[symbol];
      }
      // For futures symbols like BTCUSD_PERP, try the spot equivalent (BTCUSDT) as fallback
      if (symbol.includes("USD_")) {
        const baseAsset = symbol.split("USD_")[0];
        const spotSymbol = `${baseAsset}USDT`;
        if (data.pricePrecision[spotSymbol] !== undefined) {
          return data.pricePrecision[spotSymbol];
        }
      }
    } catch {
      // Invalid cache
    }
  }
  // Default fallback
  return 5;
}

/**
 * Get quote asset from a trading symbol synchronously from cache.
 * Returns quote asset from exchangeInfo cache, or empty string if not found.
 */
export function getQuoteAssetSync(symbol: string): string {
  const cached = precisionCache.get(PRECISION_CACHE_KEY);
  if (cached) {
    try {
      const data: PrecisionCacheData = JSON.parse(cached);
      if (data.symbolQuoteAsset[symbol]) {
        return data.symbolQuoteAsset[symbol];
      }
    } catch {
      // Invalid cache
    }
  }
  return "";
}

/**
 * Get USD price for a quote asset
 */
function getQuoteAssetUsdPrice(quoteAsset: string, prices: Map<string, number>): number {
  // USDT is our reference for USD value
  if (quoteAsset === "USDT") {
    return 1;
  }

  // Try direct USDT pair (e.g., USDCUSDT, BUSDUSDT)
  const usdtPrice = prices.get(`${quoteAsset}USDT`);
  if (usdtPrice) {
    return usdtPrice;
  }

  // Try inverse pair (e.g., USDTBRL -> 1/price gives BRL in USD)
  const inversePrice = prices.get(`USDT${quoteAsset}`);
  if (inversePrice && inversePrice > 0) {
    return 1 / inversePrice;
  }

  // For fiat currencies, try via common pairs
  const btcPair = prices.get(`BTC${quoteAsset}`);
  const btcUsdt = prices.get("BTCUSDT");
  if (btcPair && btcUsdt && btcPair > 0) {
    return btcUsdt / btcPair;
  }

  return 0;
}

/**
 * Get all ticker prices for USD value calculation
 * Also ensures precision cache is populated for price formatting
 */
export async function getTickerPrices(): Promise<Map<string, number>> {
  // Fetch prices and ensure precision cache is populated in parallel
  const [prices] = await Promise.all([
    publicRequest<TickerPrice[]>(SPOT_BASE_URL, "/api/v3/ticker/price"),
    getPrecisionData().catch(() => null), // Ensure cache is populated, ignore errors
  ]);

  const priceMap = new Map<string, number>();
  for (const ticker of prices) {
    priceMap.set(ticker.symbol, parseFloat(ticker.price));
  }

  return priceMap;
}

/**
 * Fetches 24hr ticker data for all trading pairs with USD-normalized volumes and precision
 * Filters out pairs with very low volume to reduce memory usage
 */
export async function fetchAllTickers(): Promise<Ticker24hr[]> {
  // Fetch tickers, prices, and precision map in parallel
  const [rawTickers, prices, precisionMap] = await Promise.all([
    publicRequest<Ticker24hr[]>(SPOT_BASE_URL, "/api/v3/ticker/24hr"),
    getTickerPrices(),
    getSymbolPrecisionMap(),
  ]);

  // Process tickers and filter out low-volume pairs
  const MIN_VOLUME_USD = 10000; // $10K minimum volume
  const processedTickers: Ticker24hr[] = [];

  for (const ticker of rawTickers) {
    const quoteAsset = getQuoteAssetSync(ticker.symbol);
    const quoteUsdPrice = getQuoteAssetUsdPrice(quoteAsset, prices);
    const quoteVolumeUsd = parseFloat(ticker.quoteVolume) * quoteUsdPrice;

    // Skip low-volume pairs to reduce memory
    if (quoteVolumeUsd < MIN_VOLUME_USD) continue;

    // Get precision from cached exchangeInfo (fail-first: no fallback)
    const pricePrecision = precisionMap.get(ticker.symbol);
    if (pricePrecision === undefined) {
      console.error(`[Market Prices] Missing precision for symbol: ${ticker.symbol}`);
      continue; // Skip symbols without precision data
    }

    processedTickers.push({
      ...ticker,
      quoteVolumeUsd,
      pricePrecision,
    });
  }

  return processedTickers;
}
