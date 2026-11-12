import { loadIndex } from "../lib/load-index";
import { typedInstrument } from "../lib/search";
import { MARKET_FILTERS } from "../lib/symbols";
import { describeInstrument, toolLanguage } from "../lib/tool-support";

type Input = {
  /**
   * A ticker or a name to look for. Tickers: AAPL, 0700.HK, 600519.SS, 7203.T, 005930.KS, 2330.TW, ^GSPC, BTC/USDT.
   * Names may be in English, Simplified or Traditional Chinese, Japanese or Korean: Apple, 腾讯, 台積電, トヨタ, 삼성.
   * Search one company, index or coin at a time.
   */
  query: string;
  /**
   * Only search one market. Omit it to search every market.
   * "cn" is China A-shares (Shanghai and Shenzhen), "kr" is KOSPI and KOSDAQ, "tw" is TWSE and TPEx.
   */
  market?: "us" | "hk" | "cn" | "jp" | "kr" | "tw" | "index" | "crypto";
  /** How many results to return, from 1 to 20. Defaults to 8. */
  limit?: number;
};

/**
 * Finds stocks, ETFs, indices and Binance Spot crypto pairs by ticker or by name, and returns
 * the exact symbols the other Pulse tools take.
 */
export default async function tool(input: Input) {
  const query = input.query.trim();
  if (!query) return { results: [], note: "Give a ticker or a name to search for." };
  const index = await loadIndex();
  const language = toolLanguage(query);
  const markets = MARKET_FILTERS.find((entry) => entry.value === (input.market ?? "all"))?.markets ?? [];
  const limit = Math.min(Math.max(Math.round(input.limit ?? 8), 1), 20);
  const hits = index.search(query, { language, markets, limit }).map((hit) => hit.instrument);
  // A ticker the catalog does not list can still be priced by its source.
  const typed = typedInstrument(query, index);
  const unlisted =
    typed && /[./^=]/.test(query) && !hits.some((hit) => hit.symbol === typed.symbol) && hits.length < limit;
  const results = [...hits, ...(unlisted && typed ? [typed] : [])].map(describeInstrument);
  return {
    results,
    note: results.length
      ? undefined
      : "No listing matched. Pulse covers the US, Hong Kong, China A-shares, Japan, Korea and Taiwan, major indices and Binance Spot pairs.",
  };
}
