import { loadIndex, typedInstrument } from "../lib/load";
import { readerLanguage } from "../lib/search";
import { MARKET_FILTERS, MARKET_LABELS } from "../lib/symbols";

type Input = {
  /**
   * A ticker, a crypto coin or pair, or a company name in English, Chinese, Japanese or Korean,
   * e.g. "AAPL", "台積電", "トヨタ", "삼성", "BTC" or "ETH/BTC".
   */
  query: string;
  /**
   * Only return listings from one market. Leave it out to search every market.
   */
  market?: "us" | "hk" | "cn" | "jp" | "kr" | "tw" | "index" | "crypto";
};

/**
 * Find stocks, ETFs, indices and Binance Spot crypto pairs by ticker or name.
 * Use it to find the right symbol when the user names a company, or to list several candidates.
 * Returns symbols that the Get Quote tool can price.
 */
export default async function tool(input: Input) {
  const index = await loadIndex();
  const language = readerLanguage("auto", input.query, Intl.DateTimeFormat().resolvedOptions().locale);
  const markets = MARKET_FILTERS.find((entry) => entry.value === input.market)?.markets ?? [];
  const hits = index.search(input.query, { language, markets, limit: 10 }).map((hit) => hit.instrument);
  const typed = typedInstrument(input.query, index);
  if (hits.length === 0 && typed && (markets.length === 0 || markets.includes(typed.market))) hits.push(typed);
  return hits.map((instrument) => ({
    symbol: instrument.symbol,
    name: instrument.name,
    type: instrument.kind,
    market: MARKET_LABELS[instrument.market],
    exchange: instrument.exchange,
  }));
}
