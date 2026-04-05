import { List, ActionPanel, Action, Icon, Color, Cache } from "@raycast/api";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Models ──────────────────────────────────────────────────────────────────

interface MarketSummary {
  ticker: string;
  eventTicker?: string;
  seriesTicker?: string;
  title: string;
  subtitle?: string;
  yesLabel?: string;
  noLabel?: string;
  eventTitle?: string;
  eventSubtitle?: string;
  category?: string;
  status: string;
  lastPrice?: number;
  yesPrice?: number;
  noPrice?: number;
  volume?: number;
  volume24h?: number;
  openInterest?: number;
  liquidity?: number;
  updatedAt?: Date;
  openTime?: Date;
  closeTime?: Date;
}

interface SearchResult {
  market: MarketSummary;
  score: number;
  matchedField: string;
  matchedOutcome?: "yes" | "no";
  emphasizedOdds?: number;
  emphasizedOutcomeLabel: string;
}

interface TrendPoint {
  ts: number;
  price: number;
}

type TrendWindow = "1D" | "7D" | "30D";

const TREND_CONFIG: Record<
  TrendWindow,
  { duration: number; interval: number }
> = {
  "1D": { duration: 86400, interval: 1 },
  "7D": { duration: 604800, interval: 60 },
  "30D": { duration: 2592000, interval: 1440 },
};

interface CachedMarkets {
  savedAt: string;
  markets: MarketSummary[];
}

// ─── Flexible number parsing ─────────────────────────────────────────────────

function flexNum(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function normalizePrice(v: unknown): number | undefined {
  const n = flexNum(v);
  if (n === undefined) return undefined;
  return n > 1 ? n / 100 : n;
}

// ─── API Client ──────────────────────────────────────────────────────────────

const BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

function parseMarket(
  m: Record<string, unknown>,
  event?: Record<string, unknown>,
): MarketSummary {
  const lastPrice = normalizePrice(m.last_price ?? m.last_price_dollars);
  const yesAsk = normalizePrice(m.yes_ask ?? m.yes_ask_dollars);
  const yesBid = normalizePrice(m.yes_bid ?? m.yes_bid_dollars);
  const noAsk = normalizePrice(m.no_ask ?? m.no_ask_dollars);
  const noBid = normalizePrice(m.no_bid ?? m.no_bid_dollars);

  const yesPrice = yesAsk ?? yesBid ?? lastPrice;
  const noPrice =
    noAsk ??
    noBid ??
    (lastPrice != null ? Math.max(0, 1 - lastPrice) : undefined);

  return {
    ticker: String(m.ticker ?? ""),
    eventTicker: m.event_ticker ? String(m.event_ticker) : undefined,
    seriesTicker: m.series_ticker ? String(m.series_ticker) : undefined,
    title: String(m.title ?? m.ticker ?? ""),
    subtitle: m.subtitle ? String(m.subtitle) : undefined,
    yesLabel: m.yes_sub_title ? String(m.yes_sub_title) : undefined,
    noLabel: m.no_sub_title ? String(m.no_sub_title) : undefined,
    eventTitle: event?.title ? String(event.title) : undefined,
    eventSubtitle: event?.subtitle ? String(event.subtitle) : undefined,
    category:
      (event?.category ?? m.category)
        ? String(event?.category ?? m.category)
        : undefined,
    status: String(m.status ?? "unknown"),
    lastPrice,
    yesPrice,
    noPrice,
    volume: flexNum(m.volume),
    volume24h: flexNum(m.volume_24h),
    openInterest: flexNum(m.open_interest),
    liquidity: flexNum(m.liquidity),
    updatedAt: m.last_updated ? new Date(String(m.last_updated)) : undefined,
    openTime: m.open_time ? new Date(String(m.open_time)) : undefined,
    closeTime: m.close_time ? new Date(String(m.close_time)) : undefined,
  };
}

async function fetchOpenMarkets(): Promise<MarketSummary[]> {
  const allMarkets: MarketSummary[] = [];
  let cursor: string | null = null;

  for (;;) {
    const params = new URLSearchParams({
      limit: "200",
      with_nested_markets: "true",
      status: "open",
    });
    if (cursor) params.set("cursor", cursor);

    const resp = await fetch(`${BASE_URL}/events?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      throw new Error(`Kalshi API error: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as {
      events?: Array<Record<string, unknown>>;
      cursor?: string;
    };

    const events = data.events ?? [];
    for (const event of events) {
      const nested = event.markets as
        | Array<Record<string, unknown>>
        | undefined;
      if (nested && Array.isArray(nested)) {
        for (const m of nested) {
          const status = String(m.status ?? "").toLowerCase();
          if (status === "active" || status === "open") {
            allMarkets.push(parseMarket(m, event));
          }
        }
      }
    }

    const nextCursor = data.cursor;
    if (!nextCursor || nextCursor === "") break;
    cursor = nextCursor;
  }

  return allMarkets;
}

async function fetchTrend(
  ticker: string,
  seriesTicker: string,
  window: TrendWindow,
): Promise<TrendPoint[]> {
  const cfg = TREND_CONFIG[window];
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - cfg.duration;

  const params = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(cfg.interval),
  });

  const resp = await fetch(
    `${BASE_URL}/series/${encodeURIComponent(seriesTicker)}/markets/${encodeURIComponent(ticker)}/candlesticks?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );

  if (!resp.ok) return [];

  const data = (await resp.json()) as {
    candlesticks?: Array<Record<string, unknown>>;
  };
  const candles = data.candlesticks ?? [];

  return candles
    .map((c) => {
      const ts = flexNum(c.end_period_ts ?? c.ts);
      const price = normalizePrice(c.yes_price ?? c.price ?? c.close);
      if (ts === undefined || price === undefined) return null;
      return { ts, price } as TrendPoint;
    })
    .filter((p): p is TrendPoint => p !== null)
    .sort((a, b) => a.ts - b.ts);
}

// ─── Search Index ────────────────────────────────────────────────────────────

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface IndexedMarket {
  market: MarketSummary;
  haystack: string;
  fields: {
    title: string;
    subtitle: string;
    yesLabel: string;
    noLabel: string;
    eventTitle: string;
    eventSubtitle: string;
    category: string;
    ticker: string;
  };
}

function buildIndex(markets: MarketSummary[]): IndexedMarket[] {
  return markets.map((m) => {
    const fields = {
      title: normalizeText(m.title ?? ""),
      subtitle: normalizeText(m.subtitle ?? ""),
      yesLabel: normalizeText(m.yesLabel ?? ""),
      noLabel: normalizeText(m.noLabel ?? ""),
      eventTitle: normalizeText(m.eventTitle ?? ""),
      eventSubtitle: normalizeText(m.eventSubtitle ?? ""),
      category: normalizeText(m.category ?? ""),
      ticker: normalizeText(m.ticker ?? ""),
    };
    const haystack = Object.values(fields).join(" ");
    return { market: m, haystack, fields };
  });
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

const FIELD_WEIGHTS: Record<string, number> = {
  title: 30,
  subtitle: 22,
  yesLabel: 24,
  noLabel: 24,
  eventTitle: 18,
  eventSubtitle: 12,
  category: 7,
  ticker: 10,
};

function scoreField(
  field: string,
  query: string,
  tokens: string[],
  weight: number,
): number {
  if (!field) return 0;
  let s = 0;
  if (field === query) s += weight * 4;
  else if (field.includes(query)) s += weight * 2;
  if (field.startsWith(query)) s += weight * 1.2;

  let tokensFound = 0;
  for (const t of tokens) {
    if (field.includes(t)) {
      s += weight * 0.65;
      tokensFound++;
    }
  }
  if (tokensFound === tokens.length && tokens.length > 1) {
    s += weight * 1.25;
  }

  return s;
}

function proximityBonus(title: string, tokens: string[]): number {
  if (tokens.length < 2) return 0;
  const positions: number[] = [];
  for (const t of tokens) {
    const idx = title.indexOf(t);
    if (idx < 0) return 0;
    positions.push(idx);
  }
  const spread = Math.max(...positions) - Math.min(...positions);
  return Math.max(0, 18 - spread * 0.18);
}

function recencyBonus(updatedAt?: Date): number {
  if (!updatedAt) return 0;
  const hoursAgo = (Date.now() - updatedAt.getTime()) / 3600000;
  return Math.max(0, 6 - hoursAgo) * 0.6;
}

function marketSignals(m: MarketSummary): number {
  return (
    Math.log(1 + (m.liquidity ?? 0)) * 2.2 +
    Math.log(1 + Math.max(m.volume24h ?? 0, m.volume ?? 0)) * 2.8 +
    Math.log(1 + (m.openInterest ?? 0)) * 1.2 +
    recencyBonus(m.updatedAt)
  );
}

function searchMarkets(
  index: IndexedMarket[],
  rawQuery: string,
): SearchResult[] {
  const query = normalizeText(rawQuery);
  if (query.length < 4) return [];

  const tokens = query.split(/[^a-z0-9]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return [];

  // Two-pass filter
  const candidates = index.filter((im) => {
    if (im.haystack.includes(query)) return true;
    return tokens.every((t) => im.haystack.includes(t));
  });

  const results: SearchResult[] = candidates.map((im) => {
    let totalTextScore = 0;
    let bestField = "title";
    let bestFieldScore = 0;

    for (const [fieldName, weight] of Object.entries(FIELD_WEIGHTS)) {
      const fieldVal = im.fields[fieldName as keyof typeof im.fields] ?? "";
      const fs = scoreField(fieldVal, query, tokens, weight);
      totalTextScore += fs;
      if (fs > bestFieldScore) {
        bestFieldScore = fs;
        bestField = fieldName;
      }
    }

    const signals = marketSignals(im.market);
    const prox = proximityBonus(im.fields.title, tokens);
    const score = totalTextScore + signals + prox;

    let matchedOutcome: "yes" | "no" | undefined;
    let emphasizedOdds: number | undefined;
    let emphasizedOutcomeLabel = "YES";

    if (bestField === "yesLabel" && im.market.yesPrice != null) {
      matchedOutcome = "yes";
      emphasizedOdds = Math.round(im.market.yesPrice * 100);
      emphasizedOutcomeLabel = im.market.yesLabel ?? "YES";
    } else if (bestField === "noLabel" && im.market.noPrice != null) {
      matchedOutcome = "no";
      emphasizedOdds = Math.round(im.market.noPrice * 100);
      emphasizedOutcomeLabel = im.market.noLabel ?? "NO";
    } else if (im.market.yesPrice != null) {
      emphasizedOdds = Math.round(im.market.yesPrice * 100);
      emphasizedOutcomeLabel = "YES";
    }

    return {
      market: im.market,
      score,
      matchedField: bestField,
      matchedOutcome,
      emphasizedOdds,
      emphasizedOutcomeLabel,
    };
  });

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const volA = Math.max(a.market.volume24h ?? 0, a.market.volume ?? 0);
    const volB = Math.max(b.market.volume24h ?? 0, b.market.volume ?? 0);
    return volB - volA;
  });

  return results.slice(0, 50);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatDate(d: Date | undefined): string {
  if (!d) return "N/A";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function oddsColor(matchedOutcome: "yes" | "no" | undefined): Color {
  if (matchedOutcome === "no") return Color.Red;
  return Color.Green;
}

function marketUrl(m: MarketSummary): string {
  const series = (m.seriesTicker ?? m.eventTicker ?? m.ticker).toLowerCase();
  const event = (m.eventTicker ?? m.ticker).toLowerCase();
  return `https://kalshi.com/markets/${series}/m/${event}`;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const cache = new Cache();
const CACHE_KEY = "markets";
const STALE_MS = 60_000;

function loadCachedMarkets(): MarketSummary[] | null {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedMarkets;
    return parsed.markets.map((m) => ({
      ...m,
      updatedAt: m.updatedAt ? new Date(m.updatedAt) : undefined,
      openTime: m.openTime ? new Date(m.openTime) : undefined,
      closeTime: m.closeTime ? new Date(m.closeTime) : undefined,
    }));
  } catch {
    return null;
  }
}

function isCacheStale(): boolean {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as CachedMarkets;
    return Date.now() - new Date(parsed.savedAt).getTime() > STALE_MS;
  } catch {
    return true;
  }
}

function saveMarkets(markets: MarketSummary[]): void {
  cache.set(
    CACHE_KEY,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      markets,
    } as CachedMarkets),
  );
}

// ─── Trend Cache (in-memory) ─────────────────────────────────────────────────

const trendCache = new Map<
  string,
  { points: TrendPoint[]; fetchedAt: number }
>();
const TREND_TTL_MS = 5 * 60_000;

function trendCacheKey(ticker: string, window: TrendWindow): string {
  return `${ticker}:${window}`;
}

async function getTrend(
  ticker: string,
  seriesTicker: string | undefined,
  window: TrendWindow,
): Promise<TrendPoint[]> {
  if (!seriesTicker) return [];
  const key = trendCacheKey(ticker, window);
  const cached = trendCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TREND_TTL_MS) {
    return cached.points;
  }
  const points = await fetchTrend(ticker, seriesTicker, window);
  trendCache.set(key, { points, fetchedAt: Date.now() });
  return points;
}

// ─── Detail View ─────────────────────────────────────────────────────────────

function MarketDetail({
  result,
  trendWindow,
}: {
  result: SearchResult;
  trendWindow: TrendWindow;
}) {
  const m = result.market;
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTrend(m.ticker, m.seriesTicker, trendWindow).then((pts) => {
      if (!cancelled) {
        setTrend(pts);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [m.ticker, m.seriesTicker, trendWindow]);

  const oddsText =
    result.emphasizedOdds != null
      ? `${result.emphasizedOdds}% ${result.emphasizedOutcomeLabel}`
      : "N/A";

  let trendDelta = "";
  if (trend && trend.length >= 2) {
    const first = trend[0].price;
    const last = trend[trend.length - 1].price;
    const delta = Math.round((last - first) * 100);
    const arrow = delta >= 0 ? "\u2191" : "\u2193";
    trendDelta = `${arrow} ${Math.abs(delta)} pts in ${trendWindow}`;
  }

  const vol = Math.max(m.volume24h ?? 0, m.volume ?? 0);

  const metadataLines = [
    `**Odds:** ${oddsText}`,
    "",
    `**Volume:** ${formatCompact(vol)}`,
    m.liquidity != null ? `**Liquidity:** ${formatCompact(m.liquidity)}` : "",
    m.openInterest != null
      ? `**Open Interest:** ${formatCompact(m.openInterest)}`
      : "",
    "",
    trendDelta ? `**Trend:** ${trendDelta}` : "",
    m.category ? `**Category:** ${m.category}` : "",
    `**Closes:** ${formatDate(m.closeTime)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const md = loading ? "Loading trend data..." : metadataLines;

  return (
    <List.Item.Detail
      isLoading={loading}
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Odds" text={oddsText} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Volume"
            text={formatCompact(vol)}
          />
          {m.liquidity != null && (
            <List.Item.Detail.Metadata.Label
              title="Liquidity"
              text={formatCompact(m.liquidity)}
            />
          )}
          {m.openInterest != null && (
            <List.Item.Detail.Metadata.Label
              title="Open Interest"
              text={formatCompact(m.openInterest)}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          {trendDelta && (
            <List.Item.Detail.Metadata.Label title="Trend" text={trendDelta} />
          )}
          {m.category && (
            <List.Item.Detail.Metadata.Label
              title="Category"
              text={m.category}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Closes"
            text={formatDate(m.closeTime)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="View on Kalshi"
            target={marketUrl(m)}
            text="Open"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// ─── Main Command ────────────────────────────────────────────────────────────

export default function SearchMarketsCommand() {
  const [searchText, setSearchText] = useState("");
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("7D");
  const [markets, setMarkets] = useState<MarketSummary[]>(
    () => loadCachedMarkets() ?? [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const index = useMemo(() => buildIndex(markets), [markets]);

  const results = useMemo(() => {
    if (debouncedQuery.length < 4) return [];
    return searchMarkets(index, debouncedQuery);
  }, [index, debouncedQuery]);

  // Debounce search input
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 80);
  }, []);

  // Load / refresh markets
  useEffect(() => {
    const cached = loadCachedMarkets();
    if (cached && cached.length > 0) {
      setMarkets(cached);
      if (!isCacheStale()) {
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    fetchOpenMarkets()
      .then((fresh) => {
        setMarkets(fresh);
        saveMarkets(fresh);
      })
      .catch(() => {
        // keep cached data if available
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search all Kalshi markets..."
      filtering={false}
      throttle
      isShowingDetail={results.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Trend Window"
          onChange={(v) => setTrendWindow(v as TrendWindow)}
        >
          <List.Dropdown.Item title="1 Day" value="1D" />
          <List.Dropdown.Item title="7 Days" value="7D" />
          <List.Dropdown.Item title="30 Days" value="30D" />
        </List.Dropdown>
      }
    >
      {results.length === 0 && searchText.length < 4 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Kalshi Markets"
          description={
            isLoading
              ? `Loading markets... (${markets.length} cached)`
              : `${markets.length} markets indexed. Type at least 4 characters to search.`
          }
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Results"
          description={`No markets matching "${searchText}"`}
        />
      ) : (
        results.map((r) => {
          const m = r.market;
          const oddsStr =
            r.emphasizedOdds != null
              ? `${r.emphasizedOdds}% ${r.emphasizedOutcomeLabel}`
              : "";

          const subtitle =
            m.eventTitle && m.eventTitle !== m.title
              ? m.eventTitle
              : (m.subtitle ?? "");

          return (
            <List.Item
              key={m.ticker}
              title={m.title}
              subtitle={subtitle}
              accessories={
                oddsStr
                  ? [
                      { text: oddsStr },
                      {
                        tag: {
                          value: r.emphasizedOutcomeLabel.toUpperCase(),
                          color: oddsColor(r.matchedOutcome),
                        },
                      },
                    ]
                  : []
              }
              detail={<MarketDetail result={r} trendWindow={trendWindow} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open on Kalshi"
                    url={marketUrl(m)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Market URL"
                    content={marketUrl(m)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
