import { withAccessToken } from "@raycast/utils";
import { schwabOAuth } from "../lib/oauth";
import { getQuotes } from "../lib/schwab-client";

type Input = {
  /**
   * Ticker symbols to look up, e.g. ["AAPL", "VOO"]. Index symbols use a $
   * prefix: $SPX (S&P 500), $DJI (Dow Jones), $COMPX (Nasdaq Composite).
   */
  symbols: string[];
};

/**
 * Get live market quotes for one or more stock, ETF, or index symbols:
 * last price, day change, day range, 52-week range, volume, and fundamentals
 * (P/E, EPS, dividend yield, market cap).
 */
export default withAccessToken(schwabOAuth)(async (input: Input) => {
  const symbols = input.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
  if (symbols.length === 0) throw new Error("No symbols provided");

  const quotes = await getQuotes(symbols);
  return symbols.map((symbol) => {
    const data = quotes[symbol];
    if (!data) return { symbol, found: false };
    return {
      symbol,
      found: true,
      description: data.reference?.description,
      assetType: data.assetMainType,
      lastPrice: data.quote?.lastPrice ?? data.quote?.mark,
      dayChange: data.quote?.netChange,
      dayChangePercent: data.quote?.netPercentChange,
      open: data.quote?.openPrice,
      dayHigh: data.quote?.highPrice,
      dayLow: data.quote?.lowPrice,
      week52High: data.quote?.["52WeekHigh"],
      week52Low: data.quote?.["52WeekLow"],
      volume: data.quote?.totalVolume,
      peRatio: data.fundamental?.peRatio,
      eps: data.fundamental?.eps,
      dividendYield: data.fundamental?.divYield,
      marketCap: data.fundamental?.marketCap,
    };
  });
});
