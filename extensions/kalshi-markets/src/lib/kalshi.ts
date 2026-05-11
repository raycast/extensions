import type {
  KalshiCandlestick,
  KalshiCandlesticksResponse,
  KalshiMarket,
  KalshiMarketsResponse,
  KalshiOrderbookResponse,
  KalshiTrade,
  KalshiTradesResponse,
  MarketBundle,
  MarketStatus,
} from "../types/kalshi";

const API_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const SEARCH_API_BASE = "https://api.elections.kalshi.com/v1";
const MARKET_LIMIT = 200;

export const DEFAULT_FILTERS = [
  "All",
  "Inactive",
  "Resolved",
  "Favorites",
  "Sports",
  "Politics",
  "Crypto",
  "Finance",
  "Entertainment",
  "Climate",
];

export async function fetchMarkets(
  status: MarketStatus,
  cursor?: string,
): Promise<KalshiMarketsResponse> {
  const params = new URLSearchParams({
    limit: String(MARKET_LIMIT),
    status,
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  return fetchJson<KalshiMarketsResponse>(`/markets?${params.toString()}`);
}

export async function fetchMarketsForFilter(
  status: MarketStatus,
  filter: string,
): Promise<KalshiMarket[]> {
  if (filter === "All" || filter === "Favorites") {
    const firstPage = await fetchMarkets(status);
    const secondPage = firstPage.cursor
      ? await fetchMarkets(status, firstPage.cursor)
      : undefined;
    return rankMarkets([
      ...(firstPage.markets ?? []),
      ...(secondPage?.markets ?? []),
    ]);
  }

  return fetchSearchMarkets(filter);
}

export async function fetchSearchMarkets(
  query: string,
): Promise<KalshiMarket[]> {
  const series = await fetchSeries(query);
  return rankMarkets(series.flatMap((item) => seriesToMarkets(item)));
}

export async function fetchSeries(
  query: string,
  filter = "All",
): Promise<KalshiSeries[]> {
  const normalizedQuery = query.trim();
  const filterQuery =
    filter === "All" || filter === "Favorites" || isStatusFilter(filter)
      ? ""
      : filterSearchQuery(filter);
  const searchQuery = [normalizedQuery, filterQuery].filter(Boolean).join(" ");
  const status = searchStatus(filter);

  const params =
    searchQuery.length === 0
      ? new URLSearchParams({
          order_by: "event-volume",
          status,
          page_size: "50",
          with_milestones: "true",
        })
      : new URLSearchParams({
          query: searchQuery,
          order_by: "querymatch",
          status,
          page_size: "50",
          fuzzy_threshold: "4",
          with_milestones: "true",
        });
  const response = await fetch(
    `${SEARCH_API_BASE}/search/series?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Kalshi search API returned ${response.status}`);
  }

  const json = (await response.json()) as KalshiSeriesSearchResponse;
  return json.current_page ?? [];
}

export function marketsForSeries(series: KalshiSeries): KalshiMarket[] {
  return seriesToMarkets(series).sort(
    (left, right) => marketRank(right) - marketRank(left),
  );
}

export async function fetchSeriesChartMarkdown(
  series: KalshiSeries,
): Promise<string> {
  const markets = marketsForSeries(series).slice(0, 6);
  const lines = (
    await Promise.all(
      markets.map(async (market, index) => {
        const response = await fetchCandlesticks(market);
        const points = (response.candlesticks ?? [])
          .map(candlePrice)
          .filter((value) => Number.isFinite(value));

        return {
          color: SERIES_COLORS[index % SERIES_COLORS.length],
          label: marketLabel(market),
          points,
        };
      }),
    )
  ).filter((line) => line.points.length > 1);

  if (lines.length === 0) {
    return "_No market-level chart data returned for this market._";
  }

  return `![${escapeMarkdown(getSeriesTitle(series))} chart](data:image/svg+xml;utf8,${encodeURIComponent(seriesChartSvg(series, lines))})`;
}

export function getSeriesTitle(series: KalshiSeries): string {
  return (
    series.event_title ??
    series.series_title ??
    series.event_ticker ??
    series.series_ticker ??
    "Untitled market"
  );
}

export function getSeriesSubtitle(series: KalshiSeries): string {
  return [series.category, series.event_subtitle].filter(Boolean).join(" - ");
}

export function getSeriesVolume(series: KalshiSeries): number {
  return numericValue(series.total_volume ?? series.total_series_volume);
}

export function getSeriesUrl(series: KalshiSeries): string {
  const seriesTicker = (series.series_ticker ?? "").toLowerCase();
  const eventTicker = (
    series.event_ticker ??
    series.series_ticker ??
    ""
  ).toLowerCase();
  return `https://kalshi.com/markets/${seriesTicker}/${slugify(getSeriesTitle(series))}/${eventTicker}`;
}

export function isSeriesFavorite(
  series: KalshiSeries,
  favoriteTopics: string[],
): boolean {
  return favoriteTopics.some((topic) => {
    const normalizedTopic = topic.trim().toLowerCase();
    return (
      normalizedTopic === series.event_ticker?.toLowerCase() ||
      normalizedTopic === series.series_ticker?.toLowerCase()
    );
  });
}

export function rankSeries(series: KalshiSeries[]): KalshiSeries[] {
  return [...series].sort(
    (left, right) => getSeriesVolume(right) - getSeriesVolume(left),
  );
}

export async function fetchSearchMarketsLegacy(
  query: string,
): Promise<KalshiMarket[]> {
  const params = new URLSearchParams({
    query: filterSearchQuery(query),
    order_by: "querymatch",
    page_size: "50",
    fuzzy_threshold: "4",
    with_milestones: "true",
  });
  const response = await fetch(
    `${SEARCH_API_BASE}/search/series?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Kalshi search API returned ${response.status}`);
  }

  const json = (await response.json()) as KalshiSeriesSearchResponse;
  const markets = (json.current_page ?? []).flatMap((series) =>
    seriesToMarkets(series),
  );
  return rankMarkets(markets);
}

export async function fetchMarketBundle(
  market: KalshiMarket,
): Promise<MarketBundle> {
  const [marketResponse, candlesticksResponse, orderbook, trades] =
    await Promise.all([
      fetchJson<{ market: KalshiMarket }>(`/markets/${market.ticker}`),
      fetchCandlesticks(market),
      fetchJson<KalshiOrderbookResponse>(
        `/markets/${market.ticker}/orderbook`,
      ).catch(() => ({})),
      fetchJson<KalshiTradesResponse>(
        `/markets/trades?${new URLSearchParams({ ticker: market.ticker, limit: "20" })}`,
      ).catch(() => ({})),
    ]);

  return {
    market: mergeMarketDetail(market, marketResponse.market),
    candlesticks: candlesticksResponse.candlesticks ?? [],
    orderbook,
    trades,
  };
}

export function rankMarkets(markets: KalshiMarket[]): KalshiMarket[] {
  return [...markets].sort(
    (left, right) => marketRank(right) - marketRank(left),
  );
}

export function filterMarkets(
  markets: KalshiMarket[],
  filter: string,
  favoriteMarkets: string[],
  topics: string[],
): KalshiMarket[] {
  if (filter === "All") {
    return markets;
  }

  if (filter === "Favorites") {
    return markets.filter(
      (market) =>
        favoriteMarkets.includes(market.ticker) ||
        matchesAnyTopic(market, topics),
    );
  }

  return markets.filter((market) => marketMatchesFilter(market, filter));
}

export function marketMatches(market: KalshiMarket, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return marketSearchText(market).includes(needle);
}

export function matchesAnyTopic(
  market: KalshiMarket,
  topics: string[],
): boolean {
  return topics.some((topic) => marketMatches(market, topic));
}

export function getMarketVolume(market: KalshiMarket): number {
  return numericValue(
    market.volume_24h ??
      market.volume_24h_fp ??
      market.volume ??
      market.volume_fp ??
      market.open_interest ??
      market.open_interest_fp ??
      market.liquidity ??
      market.liquidity_dollars,
  );
}

export function formatCents(value?: number | string): string {
  const numeric = numericValue(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  const cents = numeric <= 1 ? numeric * 100 : numeric;
  return `${cents.toFixed(cents > 0 && cents < 1 ? 1 : 0)}c`;
}

export function getMarketChance(market: KalshiMarket): number {
  const direct = numericValue(
    market.last_price ??
      market.last_price_dollars ??
      market.yes_bid ??
      market.yes_bid_dollars ??
      market.yes_ask ??
      market.yes_ask_dollars,
  );

  return direct <= 1 ? direct : direct / 100;
}

export function getMarketYesPrice(market: KalshiMarket): number {
  return numericValue(
    market.yes_ask ??
      market.yes_ask_dollars ??
      market.yes_bid ??
      market.yes_bid_dollars,
  );
}

export function getMarketNoPrice(market: KalshiMarket): number {
  const direct = numericValue(
    market.no_ask ??
      market.no_ask_dollars ??
      market.no_bid ??
      market.no_bid_dollars,
  );

  if (Number.isFinite(direct)) {
    return direct;
  }

  const yesBid = numericValue(market.yes_bid ?? market.yes_bid_dollars);
  if (Number.isFinite(yesBid)) {
    return 1 - (yesBid <= 1 ? yesBid : yesBid / 100);
  }

  const yesAsk = numericValue(market.yes_ask ?? market.yes_ask_dollars);
  if (Number.isFinite(yesAsk)) {
    return 1 - (yesAsk <= 1 ? yesAsk : yesAsk / 100);
  }

  return Number.NaN;
}

export function formatNumber(value?: number | string): string {
  const numeric = numericValue(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    notation: numeric >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(numeric);
}

export function getMarketUrl(market: KalshiMarket): string {
  return `https://kalshi.com/markets/${market.ticker}`;
}

export function getMarketImageUrl(market: KalshiMarket): string | undefined {
  return firstString(
    market.image_url,
    market.image_url_dark_mode,
    market.image_url_light_mode,
    market.logo_url,
    market.image,
    market.logo,
  );
}

export function getSeriesImageUrl(series: KalshiSeries): string | undefined {
  return firstString(
    series.image_url,
    series.event_image_url,
    series.series_image_url,
    series.logo_url,
    series.product_metadata?.custom_image_url,
    series.image,
    series.event_image,
    series.series_image,
    series.logo,
  );
}

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function fetchCandlesticks(
  market: KalshiMarket,
): Promise<KalshiCandlesticksResponse> {
  if (!market.series_ticker && !market.event_ticker) {
    return {};
  }

  const now = Math.floor(Date.now() / 1000);
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60;
  const params = new URLSearchParams({
    period_interval: "1440",
    start_ts: String(ninetyDaysAgo),
    end_ts: String(now),
  });
  const seriesTicker = market.series_ticker ?? market.event_ticker;

  return fetchJson<KalshiCandlesticksResponse>(
    `/series/${seriesTicker}/markets/${market.ticker}/candlesticks?${params.toString()}`,
  ).catch(() => ({}));
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Kalshi API returned ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

function marketRank(market: KalshiMarket): number {
  const volume = getMarketVolume(market);
  const priceActivity = numericValue(
    market.last_price ??
      market.last_price_dollars ??
      market.yes_bid ??
      market.yes_bid_dollars ??
      market.yes_ask ??
      market.yes_ask_dollars,
  );
  return volume * 100 + priceActivity;
}

function marketSearchText(market: KalshiMarket): string {
  return [
    market.ticker,
    market.event_ticker,
    market.title,
    market.subtitle,
    market.yes_sub_title,
    market.no_sub_title,
    market.category,
    ...(market.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function marketMatchesFilter(market: KalshiMarket, filter: string): boolean {
  return filterKeywords(filter).some((keyword) =>
    marketMatches(market, keyword),
  );
}

export function chartMarkdown(candlesticks: KalshiCandlestick[]): string {
  const points = candlesticks
    .map(candlePrice)
    .filter((value) => Number.isFinite(value));

  if (points.length < 2) {
    return "_No candlestick chart data returned for this market._";
  }

  const width = 680;
  const height = 220;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = Math.max(max - min, 1);
  const trend =
    normalizedPrice(points[points.length - 1]) - normalizedPrice(points[0]);
  const stroke = trend > 0 ? "#21d49b" : trend < 0 ? "#f87171" : "#f5b642";
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / spread) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.28"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" rx="8" fill="#111827"/><path d="${path} L${width} ${height} L0 ${height} Z" fill="url(#priceFill)"/><path d="${path}" fill="none" stroke="${stroke}" stroke-width="3"/><text x="16" y="28" fill="#f9fafb" font-family="system-ui" font-size="14">Last 90 days: ${normalizedPrice(min).toFixed(0)}c - ${normalizedPrice(max).toFixed(0)}c</text><text x="${width - 16}" y="28" fill="${stroke}" font-family="system-ui" font-size="14" font-weight="700" text-anchor="end">${formatSignedCents(trend)}</text></svg>`;

  return `![Price chart](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`;
}

export type PriceChangeStat = {
  label: string;
  change: number;
};

export type PriceStats = {
  current?: number;
  high?: number;
  low?: number;
  volatility?: number;
  changes: PriceChangeStat[];
};

export function priceStats(candlesticks: KalshiCandlestick[]): PriceStats {
  const pricedCandles = candlesticks
    .map((candle) => ({
      ts: numericValue(candle.end_period_ts),
      price: normalizedPrice(candlePrice(candle)),
      high: normalizedPrice(
        candle.high ??
          candle.yes_bid?.high_dollars ??
          candle.yes_ask?.high_dollars,
      ),
      low: normalizedPrice(
        candle.low ??
          candle.yes_bid?.low_dollars ??
          candle.yes_ask?.low_dollars,
      ),
    }))
    .filter((candle) => Number.isFinite(candle.price));

  if (pricedCandles.length === 0) {
    return { changes: [] };
  }

  const latest = pricedCandles[pricedCandles.length - 1];
  const prices = pricedCandles.map((candle) => candle.price);
  const highs = pricedCandles
    .map((candle) => candle.high)
    .filter((value) => Number.isFinite(value));
  const lows = pricedCandles
    .map((candle) => candle.low)
    .filter((value) => Number.isFinite(value));
  const changes = [
    priceChangeForWindow(pricedCandles, latest.price, "24h", 1),
    priceChangeForWindow(pricedCandles, latest.price, "7d", 7),
    priceChangeForWindow(pricedCandles, latest.price, "30d", 30),
  ].filter(Boolean) as PriceChangeStat[];

  return {
    current: latest.price,
    high: Math.max(...(highs.length ? highs : prices)),
    low: Math.min(...(lows.length ? lows : prices)),
    volatility: standardDeviation(prices),
    changes,
  };
}

export function priceCardsMarkdown(candlesticks: KalshiCandlestick[]): string {
  const stats = priceStats(candlesticks);

  if (!Number.isFinite(stats.current)) {
    return "_No price change data returned for this market._";
  }

  const changeCells = stats.changes.map(
    (change) => `| ${change.label} | **${formatSignedCents(change.change)}** |`,
  );

  return [
    "| Metric | Value |",
    "| --- | ---: |",
    `| Current | **${formatCents(stats.current)}** |`,
    `| High | ${formatCents(stats.high)} |`,
    `| Low | ${formatCents(stats.low)} |`,
    `| Volatility | ${formatCents(stats.volatility)} |`,
    ...changeCells,
  ].join("\n");
}

export function formatPriceChanges(candlesticks: KalshiCandlestick[]): string {
  const changes = priceStats(candlesticks).changes;

  if (changes.length === 0) {
    return "";
  }

  return changes
    .slice(0, 2)
    .map((change) => `${formatSignedCents(change.change)} ${change.label}`)
    .join("  ");
}

export function formatMarketPriceChange(market: KalshiMarket): string {
  const current = normalizedPrice(
    market.last_price ??
      market.last_price_dollars ??
      market.yes_bid ??
      market.yes_bid_dollars,
  );
  const previous = normalizedPrice(
    market.previous_price ?? market.previous_price_dollars,
  );

  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return "";
  }

  return `${formatSignedCents(current - previous)} 24h`;
}

export function tradeTimelineMarkdown(trades: KalshiTrade[] = []): string {
  const normalizedTrades = trades
    .map(normalizeTrade)
    .filter(
      (trade) => Number.isFinite(trade.price) && Number.isFinite(trade.count),
    )
    .slice(0, 16);

  if (normalizedTrades.length === 0) {
    return "_No recent trades returned for this market._";
  }

  return `![Recent trade timeline](data:image/svg+xml;utf8,${encodeURIComponent(tradeTimelineSvg(normalizedTrades))})`;
}

function tradeTimelineSvg(
  trades: {
    time?: Date;
    side: string;
    price: number;
    count: number;
  }[],
): string {
  const width = 680;
  const rowHeight = 38;
  const height = 58 + trades.length * rowHeight;
  const largest = Math.max(...trades.map((trade) => trade.count), 1);
  const rows = trades.map((trade, index) => {
    const prior = trades[index + 1];
    const direction = !prior
      ? "flat"
      : trade.price > prior.price
        ? "up"
        : trade.price < prior.price
          ? "down"
          : "flat";
    const color =
      direction === "up"
        ? "#21d49b"
        : direction === "down"
          ? "#f87171"
          : "#f5b642";
    const y = 46 + index * rowHeight;
    const radius = trade.count >= largest * 0.6 ? 9 : 6;
    const barWidth = 190 * (trade.count / largest);
    const time = trade.time ? shortTime(trade.time) : "recent";
    return `<circle cx="28" cy="${y}" r="${radius}" fill="${color}"/><text x="48" y="${y + 5}" fill="#f5f5f7" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="700">${escapeXml(time)}</text><text x="154" y="${y + 5}" fill="${trade.side === "Yes" ? "#21d49b" : trade.side === "No" ? "#f87171" : "#c9ccd1"}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800">${escapeXml(trade.side)}</text><text x="278" y="${y + 5}" fill="${color}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="800" text-anchor="end">${formatCents(trade.price)}</text><rect x="312" y="${y - 10}" width="${Math.max(barWidth, 6).toFixed(1)}" height="18" rx="4" fill="${color}" opacity="0.82"/><text x="640" y="${y + 5}" fill="#d7dce2" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="${trade.count >= largest * 0.6 ? "800" : "500"}" text-anchor="end">${formatNumber(trade.count)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="8" fill="#0b0c0f"/><text x="22" y="28" fill="#f5f5f7" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800">Recent Trades</text><text x="640" y="28" fill="#858991" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="14" text-anchor="end">large trades are wider</text>${rows.join("")}</svg>`;
}

export function categoryHeatmapMarkdown(markets: KalshiMarket[]): string {
  const buckets = categoryBuckets(markets).slice(0, 8);

  if (buckets.length === 0) {
    return "_No category volume data available._";
  }

  const maxVolume = Math.max(...buckets.map((bucket) => bucket.volume), 1);
  const rows = buckets.map((bucket) => {
    const bar = asciiBar(bucket.volume / maxVolume);
    return `| ${escapeMarkdownTable(bucket.category)} | ${bar} | ${formatNumber(bucket.volume)} | ${bucket.count} |`;
  });

  return [
    "| Category | Share | Volume | Markets |",
    "| --- | --- | ---: | ---: |",
    ...rows,
  ].join("\n");
}

export function categoryBuckets(markets: KalshiMarket[]): CategoryBucket[] {
  const totals = new Map<string, { volume: number; count: number }>();

  for (const market of markets) {
    const category = displayCategory(market);
    const existing = totals.get(category) ?? { volume: 0, count: 0 };
    existing.volume += getMarketVolume(market);
    existing.count += 1;
    totals.set(category, existing);
  }

  return [...totals.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((left, right) => right.volume - left.volume);
}

function numericValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string =>
      typeof value === "string" && value.trim() !== "",
  );
}

type CategoryBucket = {
  category: string;
  volume: number;
  count: number;
};

function priceChangeForWindow(
  candles: { ts: number; price: number }[],
  current: number,
  label: string,
  days: number,
): PriceChangeStat | undefined {
  const latest = candles[candles.length - 1];
  const targetTs = latest.ts - days * 24 * 60 * 60;
  const anchor =
    [...candles].reverse().find((candle) => candle.ts <= targetTs) ??
    candles[Math.max(0, candles.length - days - 1)];

  if (!anchor || anchor === latest) {
    return undefined;
  }

  return {
    label,
    change: current - anchor.price,
  };
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const mean =
    values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function normalizedPrice(value: unknown): number {
  const numeric = numericValue(value);

  if (!Number.isFinite(numeric)) {
    return Number.NaN;
  }

  return numeric <= 1 ? numeric * 100 : numeric;
}

function formatSignedCents(value?: number): string {
  const numeric = numericValue(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatCents(numeric)}`;
}

function asciiBar(ratio: number): string {
  const width = 18;
  const filled = Math.max(
    1,
    Math.round(Math.min(Math.max(ratio, 0), 1) * width),
  );
  return `${"\\|".repeat(filled)}${"&nbsp;".repeat(width - filled)}`;
}

function escapeMarkdownTable(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function normalizeTrade(trade: KalshiTrade): {
  time?: Date;
  side: string;
  price: number;
  count: number;
} {
  const rawTime =
    typeof trade.created_time === "string"
      ? new Date(trade.created_time)
      : numericValue(trade.created_ts);
  const time =
    rawTime instanceof Date
      ? rawTime
      : Number.isFinite(rawTime)
        ? new Date(rawTime * 1000)
        : undefined;
  const side = String(
    trade.taker_side ?? trade.side ?? trade.trade_type ?? "trade",
  ).toLowerCase();

  return {
    time,
    side: side.includes("yes") ? "Yes" : side.includes("no") ? "No" : side,
    price: numericValue(
      trade.yes_price ??
        trade.yes_price_dollars ??
        trade.price ??
        trade.price_dollars,
    ),
    count: numericValue(trade.count ?? trade.count_fp),
  };
}

function shortTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayCategory(market: KalshiMarket): string {
  const category =
    market.category ??
    market.tags?.find((tag) => !tag.startsWith("KX")) ??
    "Other";

  return String(category)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type KalshiSeriesSearchResponse = {
  current_page?: KalshiSeries[];
};

export type KalshiSeries = {
  series_ticker?: string;
  series_title?: string;
  event_ticker?: string;
  event_title?: string;
  event_subtitle?: string;
  image_url?: string;
  event_image_url?: string;
  series_image_url?: string;
  logo_url?: string;
  category?: string;
  total_volume?: number;
  total_series_volume?: number;
  markets?: KalshiSearchMarket[];
  product_metadata?: {
    categories?: string[];
    competition?: string;
    custom_image_url?: string;
    [key: string]: unknown;
  };
  product_metadata_derived?: {
    competition?: string;
    live_title?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type KalshiSearchMarket = KalshiMarket & {
  yes_subtitle?: string;
  no_subtitle?: string;
  close_ts?: string;
  expected_expiration_ts?: string;
};

function seriesToMarkets(series: KalshiSeries): KalshiMarket[] {
  return (series.markets ?? []).map((market) => ({
    ...market,
    series_ticker: market.series_ticker ?? series.series_ticker,
    event_ticker: market.event_ticker ?? series.event_ticker,
    title: series.event_title ?? series.series_title ?? market.title,
    subtitle:
      market.yes_subtitle ??
      market.yes_sub_title ??
      series.event_subtitle ??
      market.subtitle,
    yes_sub_title: market.yes_sub_title ?? market.yes_subtitle,
    no_sub_title: market.no_sub_title ?? market.no_subtitle,
    volume: market.volume ?? series.total_volume ?? series.total_series_volume,
    volume_24h: market.volume_24h ?? series.total_volume,
    category: market.category ?? series.category,
    image_url: market.image_url,
    image_url_dark_mode: market.image_url_dark_mode,
    image_url_light_mode: market.image_url_light_mode,
    event_image_url: market.event_image_url,
    series_image_url: market.series_image_url,
    logo_url: market.logo_url,
    tags: [
      ...(market.tags ?? []),
      ...(series.product_metadata?.categories ?? []),
      series.product_metadata?.competition,
      series.product_metadata_derived?.competition,
      series.series_ticker,
      series.series_title,
    ].filter(Boolean) as string[],
    close_time: market.close_time ?? market.close_ts,
    expected_expiration_time:
      market.expected_expiration_time ?? market.expected_expiration_ts,
  }));
}

function mergeMarketDetail(
  original: KalshiMarket,
  detail?: KalshiMarket,
): KalshiMarket {
  return {
    ...original,
    ...(detail ?? {}),
    series_ticker: original.series_ticker ?? detail?.series_ticker,
    event_ticker: original.event_ticker ?? detail?.event_ticker,
    subtitle: original.subtitle ?? detail?.subtitle,
    yes_sub_title: original.yes_sub_title ?? detail?.yes_sub_title,
    no_sub_title: original.no_sub_title ?? detail?.no_sub_title,
    category: original.category ?? detail?.category,
    image_url: original.image_url ?? detail?.image_url,
    event_image_url: original.event_image_url ?? detail?.event_image_url,
    series_image_url: original.series_image_url ?? detail?.series_image_url,
    logo_url: original.logo_url ?? detail?.logo_url,
    tags: original.tags ?? detail?.tags,
  };
}

function candlePrice(candle: KalshiCandlestick): number {
  const bid = numericValue(candle.yes_bid?.close_dollars);
  const ask = numericValue(candle.yes_ask?.close_dollars);

  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
    return (bid + ask) / 2;
  }

  return numericValue(
    candle.close ??
      candle.close_dollars ??
      candle.price?.previous_dollars ??
      candle.yes_bid?.close_dollars ??
      candle.yes_ask?.close_dollars,
  );
}

function filterSearchQuery(filter: string): string {
  if (filter === "Finance") {
    return "financials finance stocks rates inflation fed treasury ipo companies";
  }

  if (filter === "Entertainment") {
    return "entertainment movies music oscars grammys box office tv";
  }

  if (filter === "Sports") {
    return "sports nba nfl mlb nhl soccer tennis";
  }

  if (filter === "Crypto") {
    return "crypto bitcoin ethereum";
  }

  if (filter === "Climate") {
    return "climate weather temperature hurricane";
  }

  return filter;
}

function isStatusFilter(filter: string): boolean {
  return filter === "Inactive" || filter === "Resolved";
}

function searchStatus(filter: string): string {
  if (filter === "Inactive") {
    return "closed";
  }

  if (filter === "Resolved") {
    return "settled";
  }

  return "open";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type ChartLine = {
  color: string;
  label: string;
  points: number[];
};

const SERIES_COLORS = [
  "#1694db",
  "#d7e0e7",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#f97316",
];

function seriesChartSvg(series: KalshiSeries, lines: ChartLine[]): string {
  const width = 980;
  const height = 420;
  const padding = { top: 72, right: 96, bottom: 58, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allPoints = lines.flatMap((line) => line.points);
  const min = Math.min(0, Math.floor(Math.min(...allPoints) * 10) / 10);
  const max = Math.max(1, Math.ceil(Math.max(...allPoints) * 10) / 10);
  const spread = Math.max(max - min, 0.01);
  const gridValues = [0, 0.2, 0.4, 0.6, 0.8, 1].filter(
    (value) => value >= min && value <= max,
  );
  const paths = lines.map((line) => {
    const path = line.points
      .map((point, index) => {
        const x =
          padding.left + (index / (line.points.length - 1)) * chartWidth;
        const y =
          padding.top + chartHeight - ((point - min) / spread) * chartHeight;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    const last = line.points[line.points.length - 1];
    const labelY =
      padding.top + chartHeight - ((last - min) / spread) * chartHeight;

    return `<path d="${path}" fill="none" stroke="${line.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${padding.left + chartWidth}" cy="${labelY.toFixed(1)}" r="6" fill="${line.color}"/><text x="${padding.left + chartWidth + 18}" y="${(labelY - 7).toFixed(1)}" fill="${line.color}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700">${escapeXml(line.label)}</text><text x="${padding.left + chartWidth + 18}" y="${(labelY + 28).toFixed(1)}" fill="${line.color}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="32" font-weight="800">${Math.round(last * 100)}%</text>`;
  });
  const grid = gridValues
    .map((value) => {
      const y =
        padding.top + chartHeight - ((value - min) / spread) * chartHeight;
      return `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${padding.left + chartWidth}" y2="${y.toFixed(1)}" stroke="#3a3d44" stroke-width="1" stroke-dasharray="2 8"/><text x="${padding.left + chartWidth + 58}" y="${(y + 6).toFixed(1)}" fill="#a3a3a8" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="16">${Math.round(value * 100)}%</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="18" fill="#0b0c0f"/><text x="${padding.left}" y="38" fill="#f5f5f7" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="800">${escapeXml(getSeriesTitle(series))}</text><text x="${width - 118}" y="38" fill="#21d49b" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="800">Kalshi</text>${grid}<g>${paths.join("")}</g><text x="${padding.left}" y="${height - 22}" fill="#a3a3a8" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15">${formatNumber(getSeriesVolume(series))} vol</text></svg>`;
}

function marketLabel(market: KalshiMarket): string {
  const label = market.yes_sub_title ?? market.subtitle ?? market.ticker;
  return label
    .replace(/^yes\s+/i, "")
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
}

function filterKeywords(filter: string): string[] {
  return filterSearchQuery(filter).split(/\s+/).filter(Boolean);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[[\]]/g, "\\$&");
}
