import { withAccessToken } from "@raycast/utils";
import { normalizeMoverItems } from "../lib/movers";
import { schwabOAuth } from "../lib/oauth";
import { getMovers } from "../lib/schwab-client";
import type { MoverItem } from "../types/quotes";

function summarize(items: MoverItem[]) {
  return normalizeMoverItems(items)
    .slice(0, 10)
    .map((item) => ({
      symbol: item.symbol,
      description: item.description,
      lastPrice: item.lastPrice,
      changePercent: item.netPercentChange,
      volume: item.volume,
    }));
}

/**
 * Get today's top S&P 500 market movers: the 10 biggest gainers and the 10
 * biggest losers by percent change, with prices and volume.
 */
export default withAccessToken(schwabOAuth)(async () => {
  const [gainers, losers] = await Promise.all([
    getMovers("$SPX", "PERCENT_CHANGE_UP"),
    getMovers("$SPX", "PERCENT_CHANGE_DOWN"),
  ]);
  return {
    gainers: summarize(gainers.screeners ?? []),
    losers: summarize(losers.screeners ?? []),
  };
});
