import { fetchQuote } from "../lib/quotes";
import { normalizeTypedSymbol } from "../lib/symbols";
import { describeQuote } from "../lib/tool-support";

const MAX_SYMBOLS = 10;

type Input = {
  /**
   * Up to 10 symbols exactly as the search-symbols tool returns them, like AAPL, 0700.HK, 2330.TW, ^N225 or BTC/USDT.
   * Use search-symbols first when the person names a company, index or coin rather than its ticker.
   */
  symbols: string[];
};

/**
 * The latest price of stocks, ETFs, indices and crypto pairs, with today's change, open, high, low,
 * previous close, market session and how delayed the quote is.
 */
export default async function tool(input: Input) {
  const asked = [...new Set(input.symbols.map((symbol) => symbol.trim()).filter(Boolean))];
  const symbols = asked.slice(0, MAX_SYMBOLS);
  const results = await Promise.all(
    symbols.map(async (asked) => {
      const symbol = normalizeTypedSymbol(asked.replace(/\s+/g, ""));
      if (!symbol) return { symbol: asked, error: "Not a ticker or pair. Use search-symbols to find its symbol." };
      try {
        return describeQuote(await fetchQuote(symbol));
      } catch (error) {
        return { symbol, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
  return {
    quotes: results,
    note:
      asked.length > MAX_SYMBOLS
        ? `Only the first ${MAX_SYMBOLS} symbols were priced; ask again for the rest.`
        : undefined,
  };
}
