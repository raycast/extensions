import type { MoverItem } from "../types/quotes";

/** Derive percent points from prices; the screener percentage field has different units from quotes. */
export function normalizeMovers(items: MoverItem[]) {
  const bySymbol = new Map<string, MoverItem>();
  for (const item of items) {
    if (!item.symbol || item.lastPrice == null || item.netChange == null) continue;
    const previousClose = item.lastPrice - item.netChange;
    if (!Number.isFinite(previousClose) || previousClose <= 0 || !Number.isFinite(item.netChange)) continue;
    bySymbol.set(item.symbol, { ...item, netPercentChange: (item.netChange / previousClose) * 100 });
  }
  const movers = Array.from(bySymbol.values());
  return {
    gainers: movers
      .filter((item) => item.netPercentChange! > 0)
      .sort((a, b) => b.netPercentChange! - a.netPercentChange!),
    losers: movers
      .filter((item) => item.netPercentChange! < 0)
      .sort((a, b) => a.netPercentChange! - b.netPercentChange!),
  };
}
