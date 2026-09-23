import "./polyfill-ws";

import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import type {
  AllMidsResponse,
  CandleSnapshotResponse,
  ClearinghouseStateResponse,
  MetaAndAssetCtxsResponse,
  PortfolioResponse,
} from "@nktkas/hyperliquid";

import { parseNumber } from "./format";
import type {
  AggregatedPositions,
  CandleInterval,
  ChartCandle,
  MarketOverview,
  MarketRow,
  MarketSort,
  PortfolioMetric,
  PortfolioPeriod,
  PortfolioPoint,
  PositionRow,
  Wallet,
} from "./types";

type Candle = CandleSnapshotResponse[number];

const transport = new HttpTransport({ timeout: 10_000 });
const client = new InfoClient({ transport });

const intervalLookback: Record<CandleInterval, number> = {
  "1h": 1000 * 60 * 60 * 24 * 3,
  "4h": 1000 * 60 * 60 * 24 * 14,
  "1d": 1000 * 60 * 60 * 24 * 120,
};

export function buildMarketRows([meta, assetCtxs]: MetaAndAssetCtxsResponse, mids: AllMidsResponse): MarketRow[] {
  return meta.universe
    .map((asset, index): MarketRow | null => {
      if (asset.isDelisted) {
        return null;
      }

      const ctx = assetCtxs[index];
      if (!ctx) {
        return null;
      }

      const markPrice = parseNumber(ctx.markPx);
      const previousDayPrice = parseNumber(ctx.prevDayPx);
      const price = parseNumber(mids[asset.name] ?? ctx.midPx ?? ctx.markPx);
      const dayChange = previousDayPrice === 0 ? 0 : (markPrice - previousDayPrice) / previousDayPrice;

      return {
        coin: asset.name,
        price,
        markPrice,
        previousDayPrice,
        dayChange,
        funding: parseNumber(ctx.funding),
        openInterest: parseNumber(ctx.openInterest),
        dayVolumeBase: parseNumber(ctx.dayBaseVlm),
        dayVolumeUsd: parseNumber(ctx.dayNtlVlm),
        maxLeverage: asset.maxLeverage,
      };
    })
    .filter((row): row is MarketRow => row !== null)
    .sort((a, b) => b.dayVolumeUsd - a.dayVolumeUsd);
}

export function applyLiveMids(markets: MarketRow[], mids: AllMidsResponse): MarketRow[] {
  return markets.map((market) => {
    const livePrice = mids[market.coin];
    if (livePrice === undefined) {
      return market;
    }

    const price = parseNumber(livePrice, market.price);
    return {
      ...market,
      price,
      dayChange:
        market.previousDayPrice === 0 ? market.dayChange : (price - market.previousDayPrice) / market.previousDayPrice,
    };
  });
}

export function prioritizeFavoriteMarkets(markets: MarketRow[], favorites: string[]): MarketRow[] {
  const favoriteSet = new Set(favorites.map((coin) => coin.trim().toUpperCase()));
  const favoriteMarkets: MarketRow[] = [];
  const otherMarkets: MarketRow[] = [];

  markets.forEach((market) => {
    if (favoriteSet.has(market.coin)) {
      favoriteMarkets.push(market);
    } else {
      otherMarkets.push(market);
    }
  });

  return [...favoriteMarkets, ...otherMarkets];
}

interface PerpDex {
  name: string;
  fullName: string;
}

/**
 * Lists builder-deployed perp dexes (HIP-3). The API returns the main dex as
 * `null`; we drop it since its markets already come from `metaAndAssetCtxs`.
 * Discovery is best-effort — a failure yields no HIP-3 dexes rather than
 * breaking the core market list. The `dex` field isn't typed by the SDK yet, so
 * these calls go through the transport directly.
 */
export async function fetchPerpDexs(signal?: AbortSignal): Promise<string[]> {
  try {
    const dexs = (await transport.request("info", { type: "perpDexs" }, signal)) as (PerpDex | null)[];
    return dexs.filter((dex): dex is PerpDex => dex !== null).map((dex) => dex.name);
  } catch {
    return [];
  }
}

/** Metadata + asset contexts for a single builder-deployed perp dex (HIP-3). */
async function fetchDexMetaAndAssetCtxs(dex: string, signal?: AbortSignal): Promise<MetaAndAssetCtxsResponse> {
  return transport.request("info", { type: "metaAndAssetCtxs", dex }, signal) as Promise<MetaAndAssetCtxsResponse>;
}

export async function fetchMarkets(signal?: AbortSignal): Promise<MarketRow[]> {
  const [metaAndAssetCtxs, mids, dexNames] = await Promise.all([
    client.metaAndAssetCtxs(signal),
    client.allMids(signal),
    fetchPerpDexs(signal),
  ]);

  // HIP-3 markets are namespaced ("xyz:TSLA") and absent from the main `allMids`,
  // so each row falls back to its own snapshot mid from the asset context. One
  // failing dex must not drop the others, hence allSettled.
  const dexResults = await Promise.allSettled(dexNames.map((dex) => fetchDexMetaAndAssetCtxs(dex, signal)));

  const rows = buildMarketRows(metaAndAssetCtxs, mids);
  for (const result of dexResults) {
    if (result.status === "fulfilled") {
      rows.push(...buildMarketRows(result.value, mids));
    }
  }

  return rows.sort((a, b) => b.dayVolumeUsd - a.dayVolumeUsd);
}

export function getCandleRange(interval: CandleInterval, now = Date.now()): { startTime: number; endTime: number } {
  return {
    startTime: now - intervalLookback[interval],
    endTime: now,
  };
}

export function candleToChartCandle(candle: Candle): ChartCandle {
  return {
    time: candle.t,
    open: parseNumber(candle.o),
    high: parseNumber(candle.h),
    low: parseNumber(candle.l),
    close: parseNumber(candle.c),
    volume: parseNumber(candle.v),
  };
}

export async function fetchCandles(
  coin: string,
  interval: CandleInterval,
  signal?: AbortSignal,
): Promise<ChartCandle[]> {
  const range = getCandleRange(interval);
  const candles = await client.candleSnapshot({ coin, interval, ...range }, signal);
  return candles.map(candleToChartCandle);
}

export async function fetchClearinghouseState(
  wallet: Wallet,
  signal?: AbortSignal,
): Promise<ClearinghouseStateResponse> {
  return client.clearinghouseState({ user: wallet.address }, signal);
}

/**
 * Clearinghouse state for a single builder-deployed perp dex (HIP-3). The `dex`
 * field isn't typed by the SDK yet, so the call goes through the transport
 * directly, mirroring `fetchDexMetaAndAssetCtxs`.
 */
async function fetchDexClearinghouseState(
  user: string,
  dex: string,
  signal?: AbortSignal,
): Promise<ClearinghouseStateResponse> {
  return transport.request(
    "info",
    { type: "clearinghouseState", user, dex },
    signal,
  ) as Promise<ClearinghouseStateResponse>;
}

/**
 * A wallet's perps state across the main account and every builder-deployed dex
 * (HIP-3). Builder-dex positions (e.g. on "xyz" or "cash") are absent from the
 * main `clearinghouseState`, so each dex is queried separately. A failing dex is
 * skipped rather than dropping the whole wallet, hence allSettled.
 */
export async function fetchClearinghouseStates(
  wallet: Wallet,
  signal?: AbortSignal,
): Promise<ClearinghouseStateResponse[]> {
  const dexNames = await fetchPerpDexs(signal);
  const results = await Promise.allSettled([
    fetchClearinghouseState(wallet, signal),
    ...dexNames.map((dex) => fetchDexClearinghouseState(wallet.address, dex, signal)),
  ]);
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

export async function fetchPositionStates(
  wallets: Wallet[],
  signal?: AbortSignal,
): Promise<ClearinghouseStateResponse[][]> {
  return Promise.all(wallets.map((wallet) => fetchClearinghouseStates(wallet, signal)));
}

export function aggregatePositionRows(wallets: Wallet[], states: ClearinghouseStateResponse[][]): AggregatedPositions {
  const positions: PositionRow[] = [];
  const usedIds = new Set<string>();
  let accountValue = 0;
  let unrealizedPnl = 0;
  let marginUsed = 0;
  let maintenanceMarginUsed = 0;

  states.forEach((walletStates, stateIndex) => {
    const wallet = wallets[stateIndex];
    if (!wallet) {
      return;
    }

    // Each entry is the wallet's main account plus its builder-deployed dexes
    // (HIP-3); their collateral and positions are summed into one account view.
    walletStates.forEach((state) => {
      accountValue += parseNumber(state.marginSummary.accountValue);
      marginUsed += parseNumber(state.marginSummary.totalMarginUsed);
      maintenanceMarginUsed += parseNumber(state.crossMaintenanceMarginUsed);

      state.assetPositions.forEach((assetPosition) => {
        const position = assetPosition.position;
        const size = parseNumber(position.szi);
        if (size === 0) {
          return;
        }

        const pnl = parseNumber(position.unrealizedPnl);
        unrealizedPnl += pnl;

        const entryPrice = parseNumber(position.entryPx);
        const positionValue = parseNumber(position.positionValue);
        const markPrice = size === 0 ? entryPrice : positionValue / Math.abs(size);

        // Coins are unique within a dex but could repeat across them, so ensure a
        // stable unique key for the row.
        let id = `${wallet.id}-${position.coin}`;
        let suffix = 2;
        while (usedIds.has(id)) {
          id = `${wallet.id}-${position.coin}-${suffix++}`;
        }
        usedIds.add(id);

        positions.push({
          id,
          walletId: wallet.id,
          walletLabel: wallet.label,
          coin: position.coin,
          side: size > 0 ? "Long" : "Short",
          size,
          leverage: position.leverage.value,
          leverageType: position.leverage.type,
          entryPrice,
          markPrice,
          positionValue,
          unrealizedPnl: pnl,
          returnOnEquity: parseNumber(position.returnOnEquity),
          liquidationPrice: position.liquidationPx === null ? null : parseNumber(position.liquidationPx),
          marginUsed: parseNumber(position.marginUsed),
        });
      });
    });
  });

  return {
    summary: {
      accountValue,
      unrealizedPnl,
      marginUsed,
      maintenanceMarginUsed,
    },
    positions,
  };
}

/** Recomputes mark, value, uPnL and ROE from live mid prices. Liquidation price is left as-is. */
export function applyLiveMidsToPositions(positions: PositionRow[], mids: AllMidsResponse): PositionRow[] {
  return positions.map((position) => {
    const liveMid = mids[position.coin];
    if (liveMid === undefined) {
      return position;
    }

    const markPrice = parseNumber(liveMid, position.markPrice);
    const positionValue = Math.abs(position.size) * markPrice;
    const unrealizedPnl = position.size * (markPrice - position.entryPrice);
    const returnOnEquity = position.marginUsed > 0 ? unrealizedPnl / position.marginUsed : position.returnOnEquity;

    return { ...position, markPrice, positionValue, unrealizedPnl, returnOnEquity };
  });
}

/**
 * Re-derives account-level uPnL and equity after live mids have been applied to
 * individual positions. Account value moves by the change in unrealized PnL.
 */
export function recomputeSummary(
  summary: AggregatedPositions["summary"],
  positions: PositionRow[],
): AggregatedPositions["summary"] {
  const unrealizedPnl = positions.reduce((total, position) => total + position.unrealizedPnl, 0);
  const accountValue = summary.accountValue + (unrealizedPnl - summary.unrealizedPnl);
  return { ...summary, unrealizedPnl, accountValue };
}

export function sortMarkets(markets: MarketRow[], sort: MarketSort): MarketRow[] {
  const sorted = [...markets];
  switch (sort) {
    case "gainers":
      return sorted.sort((a, b) => b.dayChange - a.dayChange);
    case "losers":
      return sorted.sort((a, b) => a.dayChange - b.dayChange);
    case "funding":
      return sorted.sort((a, b) => Math.abs(b.funding) - Math.abs(a.funding));
    case "volume":
    default:
      return sorted.sort((a, b) => b.dayVolumeUsd - a.dayVolumeUsd);
  }
}

export function computeMarketOverview(markets: MarketRow[]): MarketOverview {
  return markets.reduce<MarketOverview>(
    (overview, market) => ({
      marketCount: overview.marketCount + 1,
      totalVolumeUsd: overview.totalVolumeUsd + market.dayVolumeUsd,
      totalOpenInterestUsd: overview.totalOpenInterestUsd + market.openInterest * market.markPrice,
    }),
    { marketCount: 0, totalVolumeUsd: 0, totalOpenInterestUsd: 0 },
  );
}

// The portfolio endpoint exposes both combined and perp-only series. We use the
// perp-only ones so the chart matches the perps-only account value shown elsewhere.
const portfolioPeriodKey: Record<PortfolioPeriod, string> = {
  day: "perpDay",
  week: "perpWeek",
  month: "perpMonth",
  allTime: "perpAllTime",
};

export function extractPortfolioSeries(
  periods: PortfolioResponse,
  period: PortfolioPeriod,
  metric: PortfolioMetric,
): PortfolioPoint[] {
  const key = portfolioPeriodKey[period];
  const entry = periods.find(([name]) => name === key);
  if (!entry) {
    return [];
  }

  const history = metric === "pnl" ? entry[1].pnlHistory : entry[1].accountValueHistory;
  return history.map(([time, value]) => ({ time, value: parseNumber(value) }));
}

/** Merges several wallets' series into one by summing values that share a timestamp. */
export function aggregatePortfolioSeries(seriesList: PortfolioPoint[][]): PortfolioPoint[] {
  if (seriesList.length === 1) {
    return seriesList[0];
  }

  const totals = new Map<number, number>();
  for (const series of seriesList) {
    for (const point of series) {
      totals.set(point.time, (totals.get(point.time) ?? 0) + point.value);
    }
  }

  return Array.from(totals.entries())
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time);
}

export async function fetchPortfolio(wallet: Wallet, signal?: AbortSignal): Promise<PortfolioResponse> {
  return client.portfolio({ user: wallet.address }, signal);
}

export async function fetchPortfolios(wallets: Wallet[], signal?: AbortSignal): Promise<PortfolioResponse[]> {
  return Promise.all(wallets.map((wallet) => fetchPortfolio(wallet, signal)));
}
