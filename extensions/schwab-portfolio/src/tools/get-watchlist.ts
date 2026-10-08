import { LocalStorage } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { schwabOAuth } from "../lib/oauth";
import { getQuotes } from "../lib/schwab-client";

/**
 * Get the user's local watchlist symbols with live quotes (last price and day
 * change). The watchlist is stored in Raycast, not at Schwab.
 */
export default withAccessToken(schwabOAuth)(async () => {
  const raw = await LocalStorage.getItem<string>("watchlist-symbols");
  let symbols: string[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) symbols = parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    symbols = [];
  }

  if (symbols.length === 0) return { symbols: [], note: "The watchlist is empty." };

  const quotes = await getQuotes(symbols);
  return {
    symbols: symbols.map((symbol) => ({
      symbol,
      description: quotes[symbol]?.reference?.description,
      lastPrice: quotes[symbol]?.quote?.lastPrice ?? quotes[symbol]?.quote?.mark,
      dayChange: quotes[symbol]?.quote?.netChange,
      dayChangePercent: quotes[symbol]?.quote?.netPercentChange,
    })),
  };
});
