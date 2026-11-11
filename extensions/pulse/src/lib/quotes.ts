// The two quote sources, ported from Pulse for Herdr (herdr/pulse/mods/pulse/quotes.js):
// Yahoo Finance for stocks and indices, Binance's public Spot mirror for crypto.
import { isCryptoPair } from "./symbols";

export const YAHOO = "https://query1.finance.yahoo.com/v8/finance";
export const BINANCE = "https://data-api.binance.vision/api/v3";
/** Yahoo's spark endpoint answers at most this many symbols per request. */
export const SPARK_BATCH = 20;

export class QuoteError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export interface Point {
  /** Milliseconds since the epoch. */
  time: number;
  price: number;
}

/** What a list row shows. */
export interface RowQuote {
  symbol: string;
  price: number;
  changePercent: number | null;
  currency: string | null;
  fetchedAt: number;
}

/** What the detail pane shows. */
export interface Quote extends RowQuote {
  name: string | null;
  /** The last trade or bar the price comes from. */
  timestamp: number;
  /** Null when the exchange's delay is unknown; 0 is real time. */
  delaySeconds: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  /** "open", "pre", "post" or "closed" for a stock; "24h" for a pair. */
  session: "open" | "pre" | "post" | "closed" | "24h";
  /** Today's line, oldest first. */
  series: Point[];
  /** The span the chart's x-axis covers: the day's regular session, or the last 24 hours. */
  window: [number, number] | null;
  source: "Yahoo Finance" | "Binance Spot";
  exchangeName: string | null;
}

const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.replace(/\p{Cc}/gu, "").slice(0, 100) || null : null;

const currencyOf = (value: unknown) => (typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null);

// Yahoo throttles by IP. After a 429 every Yahoo request waits out the cooldown;
// crypto never waits on Yahoo.
let yahooBlockedUntil = 0;

export function yahooCooldownRemaining(now = Date.now()): number {
  return Math.max(0, yahooBlockedUntil - now);
}

function retryAfter(response: Response): number {
  const header = response.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 600) * 1000 : 60_000;
}

async function yahooGet(url: string): Promise<unknown> {
  const wait = yahooCooldownRemaining();
  if (wait > 0) throw new QuoteError(`Yahoo Finance is rate limiting. Retrying in ${Math.ceil(wait / 1000)}s.`, wait);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (response.status === 429) {
    const ms = retryAfter(response);
    yahooBlockedUntil = Date.now() + ms;
    throw new QuoteError("Yahoo Finance is rate limiting. Try again in a minute.", ms);
  }
  if (response.status === 404) throw new QuoteError("Yahoo Finance has no quote for this ticker.");
  if (!response.ok) throw new QuoteError(`Yahoo Finance returned HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new QuoteError("Yahoo Finance returned an unreadable response.");
  }
}

async function binanceGet(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  // -1121 Invalid symbol: one unknown or delisted pair fails the whole batch.
  if (response.status === 400) throw new QuoteError("Binance has no Spot pair with this name.");
  if (response.status === 429 || response.status === 418) {
    throw new QuoteError("Binance is rate limiting. Try again in a minute.", retryAfter(response));
  }
  if (!response.ok) throw new QuoteError(`Binance returned HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new QuoteError("Binance returned an unreadable response.");
  }
}

const span = (value: { start?: unknown; end?: unknown } | undefined): [number, number] | null =>
  value && positive(value.start) && positive(value.end) && value.end > value.start
    ? [value.start * 1000, value.end * 1000]
    : null;

/** Today's 5-minute bars: the quote and the intraday line in one request. */
export function yahooChartUrl(symbol: string): string {
  return `${YAHOO}/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d&includePrePost=false`;
}

interface YahooMeta {
  symbol?: unknown;
  currency?: unknown;
  longName?: unknown;
  shortName?: unknown;
  fullExchangeName?: unknown;
  regularMarketPrice?: unknown;
  regularMarketTime?: unknown;
  regularMarketDayHigh?: unknown;
  regularMarketDayLow?: unknown;
  previousClose?: unknown;
  chartPreviousClose?: unknown;
  exchangeDataDelayedBy?: unknown;
  currentTradingPeriod?: Record<string, { start?: unknown; end?: unknown }>;
  tradingPeriods?: { start?: unknown; end?: unknown }[][];
}

export function decodeYahooChart(symbol: string, body: unknown, now: number): Quote {
  const chart = (body as { chart?: { result?: unknown[]; error?: unknown } })?.chart;
  const result = chart?.result?.[0] as
    | {
        meta?: YahooMeta;
        timestamp?: unknown[];
        indicators?: { quote?: { open?: unknown[]; close?: unknown[] }[] };
      }
    | undefined;
  const meta = result?.meta;
  if (chart?.error || !meta) throw new QuoteError("Yahoo Finance has no quote for this ticker.");
  // Never show another instrument's response under the requested ticker.
  if (typeof meta.symbol !== "string" || meta.symbol.toUpperCase() !== symbol.toUpperCase()) {
    throw new QuoteError("Yahoo Finance returned a different ticker.");
  }
  if (!positive(meta.regularMarketPrice) || !positive(meta.regularMarketTime)) {
    throw new QuoteError("Yahoo Finance returned an incomplete quote.");
  }
  const close = positive(meta.previousClose)
    ? meta.previousClose
    : positive(meta.chartPreviousClose)
      ? meta.chartPreviousClose
      : null;
  const times = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const bars = result?.indicators?.quote?.[0] ?? {};
  const closes = Array.isArray(bars.close) ? bars.close : [];
  const opens = Array.isArray(bars.open) ? bars.open : [];
  const series: Point[] = [];
  times.forEach((time, index) => {
    const price = closes[index];
    if (positive(time) && positive(price)) series.push({ time: time * 1000, price });
  });
  const firstOpen = opens.find(positive) ?? null;
  const prices = series.map((point) => point.price);
  const current = meta.currentTradingPeriod ?? {};
  const within = (range: [number, number] | null) => range !== null && now >= range[0] && now < range[1];
  const session = within(span(current.regular))
    ? "open"
    : within(span(current.pre))
      ? "pre"
      : within(span(current.post))
        ? "post"
        : "closed";
  // The session the bars belong to; `currentTradingPeriod` moves to the next one once a market closes.
  const window = span(meta.tradingPeriods?.[0]?.[0]) ?? span(current.regular);
  const delay = meta.exchangeDataDelayedBy;
  return {
    symbol,
    name: cleanText(meta.longName) ?? cleanText(meta.shortName),
    price: meta.regularMarketPrice,
    changePercent: close ? ((meta.regularMarketPrice - close) / close) * 100 : null,
    currency: currencyOf(meta.currency),
    fetchedAt: now,
    timestamp: meta.regularMarketTime * 1000,
    // Yahoo gives the delay in minutes.
    delaySeconds: typeof delay === "number" && Number.isFinite(delay) && delay >= 0 ? delay * 60 : null,
    open: firstOpen,
    high: positive(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : prices.length ? Math.max(...prices) : null,
    low: positive(meta.regularMarketDayLow) ? meta.regularMarketDayLow : prices.length ? Math.min(...prices) : null,
    previousClose: close,
    session,
    series,
    window,
    source: "Yahoo Finance",
    exchangeName: cleanText(meta.fullExchangeName),
  };
}

export async function fetchYahooQuote(symbol: string): Promise<Quote> {
  return decodeYahooChart(symbol, await yahooGet(yahooChartUrl(symbol)), Date.now());
}

/** Up to SPARK_BATCH symbols' last price and change in one request. */
export function sparkUrl(symbols: string[]): string {
  return `${YAHOO}/spark?symbols=${symbols.map(encodeURIComponent).join(",")}&range=1d&interval=5m`;
}

export function decodeSpark(symbols: string[], body: unknown, now: number): Record<string, RowQuote> {
  const rows: Record<string, RowQuote> = {};
  const answers = (body ?? {}) as Record<
    string,
    {
      symbol?: unknown;
      close?: unknown[];
      previousClose?: unknown;
      chartPreviousClose?: unknown;
      fulldayPrice?: unknown;
    }
  >;
  for (const symbol of symbols) {
    const answer = answers[symbol];
    if (!answer || typeof answer.symbol !== "string" || answer.symbol.toUpperCase() !== symbol.toUpperCase()) continue;
    const closes = Array.isArray(answer.close) ? answer.close.filter(positive) : [];
    // The last bar's close; `fulldayPrice` can disagree with the chart's regularMarketPrice,
    // so it only stands in when nothing has traded today.
    const price = closes.length ? closes[closes.length - 1] : answer.fulldayPrice;
    if (!positive(price)) continue;
    const close = positive(answer.previousClose)
      ? answer.previousClose
      : positive(answer.chartPreviousClose)
        ? answer.chartPreviousClose
        : null;
    rows[symbol] = {
      symbol,
      price,
      changePercent: close ? ((price - close) / close) * 100 : null,
      currency: null,
      fetchedAt: now,
    };
  }
  return rows;
}

export async function fetchSparkQuotes(symbols: string[]): Promise<Record<string, RowQuote>> {
  const rows: Record<string, RowQuote> = {};
  for (let start = 0; start < symbols.length; start += SPARK_BATCH) {
    const batch = symbols.slice(start, start + SPARK_BATCH);
    Object.assign(rows, decodeSpark(batch, await yahooGet(sparkUrl(batch)), Date.now()));
  }
  return rows;
}

interface BinanceTicker {
  symbol?: unknown;
  lastPrice?: unknown;
  prevClosePrice?: unknown;
  openPrice?: unknown;
  highPrice?: unknown;
  lowPrice?: unknown;
  closeTime?: unknown;
}

const number = (value: unknown) => {
  const parsed = Number(value);
  return positive(parsed) ? parsed : null;
};

function decodeTicker(pair: string, ticker: BinanceTicker, now: number): RowQuote {
  const price = number(ticker.lastPrice);
  if (price === null) throw new QuoteError("Binance returned an incomplete quote.");
  const previous = number(ticker.prevClosePrice);
  return {
    symbol: pair,
    price,
    // Against the price 24 hours before the last trade.
    changePercent: previous ? ((price - previous) / previous) * 100 : null,
    currency: pair.split("/")[1],
    fetchedAt: now,
  };
}

/** Many pairs' 24-hour tickers in one request; a pair Binance did not return is absent. */
export async function fetchBinanceRows(pairs: string[]): Promise<Record<string, RowQuote>> {
  if (pairs.length === 0) return {};
  const wanted = new Map(pairs.map((pair) => [pair.replace("/", ""), pair]));
  const url = `${BINANCE}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify([...wanted.keys()]))}`;
  const body = await binanceGet(url);
  const rows: Record<string, RowQuote> = {};
  const now = Date.now();
  for (const ticker of (Array.isArray(body) ? body : [body]) as BinanceTicker[]) {
    const pair = typeof ticker?.symbol === "string" ? wanted.get(ticker.symbol) : undefined;
    if (!pair) continue;
    try {
      rows[pair] = decodeTicker(pair, ticker, now);
    } catch {
      // Leave this row without a price.
    }
  }
  return rows;
}

/** One pair's ticker and its last 24 hours in 15-minute bars. */
export async function fetchBinanceQuote(pair: string): Promise<Quote> {
  if (!isCryptoPair(pair)) throw new QuoteError("Not a Binance Spot pair.");
  const code = encodeURIComponent(pair.replace("/", ""));
  const [ticker, klines] = await Promise.all([
    binanceGet(`${BINANCE}/ticker/24hr?symbol=${code}`),
    binanceGet(`${BINANCE}/klines?symbol=${code}&interval=15m&limit=96`),
  ]);
  const now = Date.now();
  const raw = ticker as BinanceTicker;
  const row = decodeTicker(pair, raw, now);
  const series: Point[] = [];
  for (const bar of Array.isArray(klines) ? klines : []) {
    if (!Array.isArray(bar)) continue;
    const time = Number(bar[6]);
    const price = number(bar[4]);
    if (positive(time) && price !== null) series.push({ time, price });
  }
  const time = number(raw.closeTime) ?? now;
  return {
    symbol: pair,
    name: null,
    price: row.price,
    changePercent: row.changePercent,
    currency: row.currency,
    fetchedAt: now,
    timestamp: time,
    delaySeconds: 0,
    open: number(raw.openPrice),
    high: number(raw.highPrice),
    low: number(raw.lowPrice),
    previousClose: number(raw.prevClosePrice),
    session: "24h",
    series,
    window: [now - 24 * 60 * 60_000, now],
    source: "Binance Spot",
    exchangeName: "Binance Spot",
  };
}

export function fetchQuote(symbol: string): Promise<Quote> {
  return isCryptoPair(symbol) ? fetchBinanceQuote(symbol) : fetchYahooQuote(symbol);
}
