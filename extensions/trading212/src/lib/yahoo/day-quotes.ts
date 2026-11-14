import type { DayQuote } from "../portfolio";
import type { Position } from "../t212/types";

export interface PositionQuote {
  symbol: string | null;
  quote?: DayQuote;
}

/**
 * Looks up every position on Yahoo, a few at a time, and returns what has answered within
 * `budgetMs`. Positions still waiting (or failed) are left out, so Trading 212 data never waits on Yahoo.
 */
export async function collectDayQuotes(
  positions: Position[],
  lookup: (position: Position) => Promise<PositionQuote>,
  opts: { concurrency: number; budgetMs: number },
): Promise<{ symbols: Record<string, string | null>; quotes: Record<string, DayQuote> }> {
  const symbols: Record<string, string | null> = {};
  const quotes: Record<string, DayQuote> = {};
  let expired = false;
  let next = 0;

  async function worker() {
    while (!expired && next < positions.length) {
      const position = positions[next++];
      try {
        const result = await lookup(position);
        if (expired) return;
        symbols[position.instrument.ticker] = result.symbol;
        if (result.quote) quotes[position.instrument.ticker] = result.quote;
      } catch {
        // A failed lookup just leaves this position without Yahoo data.
      }
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, opts.budgetMs);
  });
  const workers = Promise.all(Array.from({ length: Math.min(opts.concurrency, positions.length) }, worker));
  await Promise.race([workers, budget]);
  expired = true;
  clearTimeout(timer);
  return { symbols, quotes };
}
