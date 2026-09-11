import {
  compactNumber,
  formatPrice,
  formatProbability,
  titleCase,
} from "../market-format";
import { fetchJson } from "../market-http";
import { Asset, Quote, SearchResult } from "../market-types";
import {
  polymarketOutcomeBook,
  polymarketOutcomeChange,
  polymarketOutcomePrice,
} from "../polymarket";
import { finiteNumber, httpsImageUrl, parseJsonArray } from "./shared";

type GammaMarket = {
  id: string;
  question: string;
  slug: string;
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  oneDayPriceChange?: number;
  updatedAt?: string;
  volume?: string | number;
  volumeNum?: string | number;
  active?: boolean;
  closed?: boolean;
  image?: string;
  icon?: string;
};

type GammaSearchResponse = {
  events?: { markets?: GammaMarket[] }[];
};

export async function fetchPolymarketQuote(
  asset: Asset,
): Promise<Quote | undefined> {
  const market = await fetchJson<GammaMarket>(
    `https://gamma-api.polymarket.com/markets/${encodeURIComponent(asset.query)}`,
  );
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices).map(Number);
  const index = outcomes.findIndex(
    (outcome) => outcome.toLowerCase() === asset.outcome,
  );
  if (index < 0) return undefined;
  const price = polymarketOutcomePrice(
    prices,
    index,
    outcomes.length,
    finiteNumber(market.lastTradePrice),
  );
  if (price === undefined) return undefined;

  const outcome = outcomes[index] ?? titleCase(asset.outcome ?? "yes");
  const book = polymarketOutcomeBook(
    finiteNumber(market.bestBid),
    finiteNumber(market.bestAsk),
    index,
    outcomes.length,
  );
  return {
    id: asset.id,
    kind: asset.kind,
    symbol: outcome.toUpperCase(),
    name: market.question,
    price,
    priceLabel: formatPrice(price, "probability"),
    changePercent: polymarketOutcomeChange(
      finiteNumber(market.oneDayPriceChange),
      index,
      outcomes.length,
    ),
    provider: "Polymarket",
    asOf: market.updatedAt ?? new Date().toISOString(),
    url: `https://polymarket.com/market/${market.slug}`,
    subtitle: `Bid ${formatProbability(book.bid)} Ask ${formatProbability(book.ask)}`,
    volume: finiteNumber(market.volumeNum ?? market.volume),
    imageUrl: httpsImageUrl(market.icon ?? market.image),
  };
}

export async function searchPolymarket(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const url = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(query)}&limit_per_type=5&events_status=active&search_profiles=false&search_tags=false`;
  const response = await fetchJson<GammaSearchResponse>(url, signal);
  const markets = (response.events ?? [])
    .flatMap((event) => event.markets ?? [])
    .filter((market) => market.active !== false && market.closed !== true)
    .slice(0, 8);
  return markets.flatMap((market) => {
    const outcomes = parseJsonArray(market.outcomes);
    const prices = parseJsonArray(market.outcomePrices).map(Number);
    return outcomes.slice(0, 10).map((outcome, index) => ({
      id: `polymarket:${market.id}:${outcome.toLowerCase()}`,
      kind: "polymarket" as const,
      symbol: outcome.toUpperCase(),
      name: market.question,
      provider: "Polymarket",
      query: market.id,
      outcome: outcome.toLowerCase(),
      subtitle: `${outcome} ${formatProbability(prices[index])} / Vol ${compactNumber(Number(market.volumeNum ?? market.volume ?? 0))}`,
      url: `https://polymarket.com/market/${market.slug}`,
      imageUrl: httpsImageUrl(market.icon ?? market.image),
    }));
  });
}
