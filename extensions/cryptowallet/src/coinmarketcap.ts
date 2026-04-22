import { getPreferenceValues } from "@raycast/api";

import { AssetSearchResult, CryptoTransaction, Quote } from "./types";

const API_BASE_URL = "https://pro-api.coinmarketcap.com";
let assetMapCache: AssetSearchResult[] | undefined;

type CmcQuotePayload = {
  id?: number;
  name?: string;
  symbol?: string;
  quote?: Record<
    string,
    {
      price?: number;
      percent_change_24h?: number;
      percent_change_7d?: number;
      market_cap?: number;
      last_updated?: string;
    }
  >;
};

type CmcAssetMapPayload = {
  id?: number;
  rank?: number;
  name?: string;
  symbol?: string;
  slug?: string;
  is_active?: number;
};

type CmcResponse<T> = {
  data?: T;
  status?: {
    error_code?: number;
    error_message?: string;
  };
};

function getApiKey(): string {
  return getPreferenceValues<Preferences>().coinMarketCapApiKey;
}

async function request<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-CMC_PRO_API_KEY": getApiKey(),
    },
  });

  const payload = (await response.json()) as CmcResponse<T>;
  if (!response.ok || payload.status?.error_code) {
    throw new Error(payload.status?.error_message || `CoinMarketCap request failed (${response.status})`);
  }

  return payload.data as T;
}

function normalizeQuote(payload: CmcQuotePayload, currency: string): Quote | undefined {
  const quote = payload.quote?.[currency];
  if (!payload.symbol || !payload.name || quote?.price === undefined) {
    return undefined;
  }

  return {
    id: payload.id,
    symbol: payload.symbol.toUpperCase(),
    name: payload.name,
    price: quote.price,
    percentChange24h: quote.percent_change_24h,
    percentChange7d: quote.percent_change_7d,
    marketCap: quote.market_cap,
    lastUpdated: quote.last_updated,
  };
}

function normalizeQuotes(data: unknown, currency: string): Quote[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.values(data as Record<string, CmcQuotePayload | CmcQuotePayload[]>)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .map((entry) => normalizeQuote(entry, currency))
    .filter((quote): quote is Quote => Boolean(quote));
}

export function quoteKey(input: { assetId?: number; symbol?: string; assetSymbol?: string }): string {
  const symbol = input.symbol || input.assetSymbol || "";
  return input.assetId ? `id:${input.assetId}` : `symbol:${symbol.toUpperCase()}`;
}

function quoteToMap(acc: Record<string, Quote>, quote: Quote): Record<string, Quote> {
  if (quote.id) {
    acc[`id:${quote.id}`] = quote;
  }

  acc[`symbol:${quote.symbol}`] = quote;
  return acc;
}

export async function getLatestQuotes(symbols: string[], currency: string): Promise<Record<string, Quote>> {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
  if (uniqueSymbols.length === 0) {
    return {};
  }

  const data = await request<unknown>("/v2/cryptocurrency/quotes/latest", {
    symbol: uniqueSymbols.join(","),
    convert: currency,
  });

  return normalizeQuotes(data, currency).reduce<Record<string, Quote>>(quoteToMap, {});
}

export async function getLatestQuotesByIds(ids: number[], currency: string): Promise<Record<string, Quote>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {};
  }

  const data = await request<unknown>("/v2/cryptocurrency/quotes/latest", {
    id: uniqueIds.join(","),
    convert: currency,
  });

  return normalizeQuotes(data, currency).reduce<Record<string, Quote>>(quoteToMap, {});
}

export async function getLatestQuotesForTransactions(
  transactions: CryptoTransaction[],
  currency: string,
): Promise<Record<string, Quote>> {
  const ids = transactions.flatMap((transaction) => (transaction.assetId ? [transaction.assetId] : []));
  const symbols = transactions
    .filter((transaction) => !transaction.assetId)
    .map((transaction) => transaction.assetSymbol.toUpperCase());
  const [byId, bySymbol] = await Promise.all([getLatestQuotesByIds(ids, currency), getLatestQuotes(symbols, currency)]);
  return { ...bySymbol, ...byId };
}

export async function getLatestQuotesAndConvertedTransactions(
  transactions: CryptoTransaction[],
  currency: string,
): Promise<{ quotes: Record<string, Quote>; transactions: CryptoTransaction[] }> {
  const quotes = await getLatestQuotesForTransactions(transactions, currency);
  const sourceCurrencies = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.currency || "USD")
        .filter((transactionCurrency) => transactionCurrency !== currency),
    ),
  );

  if (sourceCurrencies.length === 0) {
    return { quotes, transactions };
  }

  const sourceQuotesByCurrency = await Promise.all(
    sourceCurrencies.map(async (sourceCurrency) => ({
      currency: sourceCurrency,
      quotes: await getLatestQuotesForTransactions(
        transactions.filter((transaction) => (transaction.currency || "USD") === sourceCurrency),
        sourceCurrency,
      ),
    })),
  );

  const sourceQuoteMap = new Map(sourceQuotesByCurrency.map((entry) => [entry.currency, entry.quotes]));

  return {
    quotes,
    transactions: transactions.map((transaction) => {
      const sourceCurrency = transaction.currency || "USD";
      if (sourceCurrency === currency) {
        return transaction;
      }

      const targetQuote = quotes[quoteKey(transaction)];
      const sourceQuote = sourceQuoteMap.get(sourceCurrency)?.[quoteKey(transaction)];
      if (!targetQuote?.price || !sourceQuote?.price) {
        return transaction;
      }

      const conversionRate = targetQuote.price / sourceQuote.price;
      return {
        ...transaction,
        price: transaction.price * conversionRate,
        fee: transaction.fee * conversionRate,
        currency,
      };
    }),
  };
}

export async function getLatestQuoteById(id: number, currency: string): Promise<Quote | undefined> {
  const quotes = await getLatestQuotesByIds([id], currency);
  return quotes[`id:${id}`];
}

export async function resolveAsset(symbol: string, currency: string): Promise<Quote | undefined> {
  const quotes = await getLatestQuotes([symbol], currency);
  return quotes[`symbol:${symbol.trim().toUpperCase()}`];
}

export async function searchAssets(query: string): Promise<AssetSearchResult[]> {
  const trimmedQuery = query.trim().toLowerCase();
  if (trimmedQuery.length < 2) {
    return [];
  }

  if (!assetMapCache) {
    const data = await request<CmcAssetMapPayload[]>("/v1/cryptocurrency/map", {
      listing_status: "active",
      start: 1,
      limit: 5000,
    });

    assetMapCache = data
      .filter((asset) => asset.id && asset.symbol && asset.name && asset.is_active !== 0)
      .map((asset) => ({
        id: asset.id as number,
        rank: asset.rank,
        symbol: (asset.symbol as string).toUpperCase(),
        name: asset.name as string,
        slug: asset.slug,
      }));
  }

  return assetMapCache
    .filter((asset) => {
      const symbol = asset.symbol.toLowerCase();
      const name = asset.name.toLowerCase();
      const slug = asset.slug?.toLowerCase() || "";
      return symbol.includes(trimmedQuery) || name.includes(trimmedQuery) || slug.includes(trimmedQuery);
    })
    .sort((a, b) => {
      const aExact = a.symbol.toLowerCase() === trimmedQuery || a.name.toLowerCase() === trimmedQuery;
      const bExact = b.symbol.toLowerCase() === trimmedQuery || b.name.toLowerCase() === trimmedQuery;
      if (aExact !== bExact) {
        return aExact ? -1 : 1;
      }

      return (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 50);
}
