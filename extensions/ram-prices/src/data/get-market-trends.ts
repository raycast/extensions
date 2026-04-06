import { withCache } from "@raycast/utils";
import { fetchMarketTrends } from "../api/ramradar";
import type { MarketTrendPoint, MarketTrendSeries, MarketTrendsData, MemoryGeneration } from "../types/market-trends";

const SERIES_ORDER: MemoryGeneration[] = ["DDR5", "DDR4"];

function toSeries(generation: MemoryGeneration, history: MarketTrendPoint[]): MarketTrendSeries | undefined {
  const sorted = [...history].sort((left, right) => left.date.localeCompare(right.date));
  const latest = sorted.at(-1);

  if (!latest) {
    return undefined;
  }

  const previous = sorted.at(-2);
  const changePercent =
    previous && previous.avgPricePerGb > 0
      ? ((latest.avgPricePerGb - previous.avgPricePerGb) / previous.avgPricePerGb) * 100
      : undefined;

  return {
    generation,
    latest,
    previous,
    changePercent,
    history: sorted,
  };
}

async function getMarketTrendsUncached(): Promise<MarketTrendsData> {
  const raw = await fetchMarketTrends();
  const series = [toSeries("DDR5", raw.ddr5), toSeries("DDR4", raw.ddr4)]
    .filter((value): value is MarketTrendSeries => value !== undefined)
    .sort((left, right) => SERIES_ORDER.indexOf(left.generation) - SERIES_ORDER.indexOf(right.generation));

  const lastUpdated =
    series
      .map((entry) => entry.latest.date)
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 10);

  return {
    series,
    lastUpdated,
  };
}

export const getMarketTrends = withCache(getMarketTrendsUncached, {
  maxAge: 1 * 60 * 60 * 1000,
});
