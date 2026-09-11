import { Quote, SearchResult } from "./types";
import { showToast, Toast } from "@raycast/api";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const US_EXCHANGES = ["NASDAQ", "NYSE", "NYSEARCA", "NYSEAMERICAN", "BATS", "MUTF"];

const FALLBACK_EXCHANGES = [
  "NASDAQ",
  "NYSE",
  "NYSEARCA",
  "NYSEAMERICAN",
  "MUTF",
  "BATS",
  "TSE",
  "LON",
  "ASX",
  "HKG",
  "SHA",
  "SHE",
  "NSE",
  "BOM",
  "FRA",
  "ETR",
  "TYO",
];

function extractKeyValuePairs(html: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const regex = /class="mfs7Fc"[^>]*>([^<]+)<[\s\S]*?class="P6K39c">([^<]+)</g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    pairs[match[1]!.trim()] = match[2]!.trim();
  }
  return pairs;
}

function parseQuoteFromHtml(html: string, symbol: string, exchange: string): Quote | null {
  // Extract current price
  const lastPriceMatch = html.match(/data-last-price="([^"]+)"/);
  if (!lastPriceMatch) return null;

  const price = parseFloat(lastPriceMatch[1]!);
  if (isNaN(price)) return null;

  // Extract currency
  const currencyMatch = html.match(/data-currency-code="([^"]+)"/);
  const currency = currencyMatch ? currencyMatch[1]! : "USD";

  // Extract name from title tag and decode HTML entities
  const titleMatch = html.match(/<title>([^(]+)\(([^)]+)\)/);
  const rawName = titleMatch ? titleMatch[1]!.trim() : symbol;
  const name = rawName
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  // Extract key-value data from the details section
  const kvPairs = extractKeyValuePairs(html);

  // Previous close
  const prevCloseRaw = kvPairs["Previous close"];
  const previousClose = prevCloseRaw ? parseFloat(prevCloseRaw.replace(/[^0-9.-]/g, "")) : price;

  // Compute change
  const change = price - previousClose;
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

  // Market cap
  const marketCap = kvPairs["Market cap"] || undefined;

  // Day range
  const dayRange = kvPairs["Day range"] || undefined;
  let open: number | undefined;
  if (dayRange) {
    const parts = dayRange.split("-");
    if (parts[0]) {
      const val = parseFloat(parts[0].replace(/[^0-9.-]/g, ""));
      if (!isNaN(val)) open = val;
    }
  }

  // Year range
  const yearRange = kvPairs["Year range"] || undefined;

  // Average volume
  const avgVolume = kvPairs["Avg Volume"] || kvPairs["Average volume"] || undefined;

  // P/E ratio
  const peRatio = kvPairs["P/E ratio"] || undefined;

  // Dividend yield
  const dividendYield = kvPairs["Dividend yield"] || undefined;

  // Primary exchange
  const primaryExchange = kvPairs["Primary exchange"] || undefined;

  // Determine market state
  let marketState: Quote["marketState"] = "CLOSED";
  if (html.includes("Pre-market")) {
    marketState = "PRE";
  } else if (html.includes("After hours")) {
    marketState = "POST";
  } else if (html.includes("Market open") || html.includes("Disclaimer")) {
    // If page has a "Disclaimer" link near the timestamp, market data is live
    const timestampArea = html.match(/class="ygUjEc"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)/);
    if (timestampArea && !timestampArea[0].includes("Closed")) {
      marketState = "REGULAR";
    }
  }

  return {
    symbol,
    name,
    price,
    currency,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    previousClose,
    open,
    dayRange,
    yearRange,
    marketCap,
    avgVolume,
    peRatio,
    dividendYield,
    primaryExchange,
    exchange,
    marketState,
  };
}

export async function fetchQuote(symbol: string, exchange?: string, signal?: AbortSignal): Promise<Quote | null> {
  const exchangesToTry = exchange
    ? [exchange]
    : [...US_EXCHANGES, ...FALLBACK_EXCHANGES.filter((ex) => !US_EXCHANGES.includes(ex))];

  for (const exch of exchangesToTry) {
    const url = `https://www.google.com/finance/quote/${encodeURIComponent(symbol.toUpperCase())}:${exch}`;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal,
      });

      if (!response.ok) continue;
      const html = await response.text();
      if (!html.includes("data-last-price")) continue;

      const quote = parseQuoteFromHtml(html, symbol.toUpperCase(), exch);
      if (quote) return quote;
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      continue;
    }
  }

  return null;
}

export async function fetchQuotes(
  symbols: { symbol: string; exchange?: string }[],
  signal?: AbortSignal,
): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();

  // Fetch all in parallel (max 5 concurrent)
  const chunks: { symbol: string; exchange?: string }[][] = [];
  for (let i = 0; i < symbols.length; i += 5) {
    chunks.push(symbols.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async ({ symbol, exchange }) => {
      const quote = await fetchQuote(symbol, exchange, signal);
      if (quote) {
        results.set(symbol.toUpperCase(), quote);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

export async function searchStocks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const url = `https://stockanalysis.com/api/search?q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal,
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      data?: { s?: string; n?: string; t?: string }[];
    };
    const items = data?.data;
    if (!Array.isArray(items)) return [];

    // Filter to US stocks and ETFs (type "s" = stock, "e" = ETF)
    // Exclude items with "/" in the symbol path (foreign exchanges)
    const results: SearchResult[] = [];
    for (const item of items) {
      if (!item.s || !item.n) continue;
      if (item.s.includes("/")) continue; // foreign exchange like "sha/603020"
      if (item.t !== "s" && item.t !== "e") continue;

      results.push({
        symbol: item.s,
        name: item.n,
        exchange: "",
        type: item.t === "e" ? "ETF" : "Stock",
      });

      if (results.length >= 8) break;
    }

    return results;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    showToast(Toast.Style.Failure, "Stock search failed", (e as Error).message || "");
    return [];
  }
}
