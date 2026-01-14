import { StockItem } from "../../types";

// ============================================================================
// Data Processing
// ============================================================================

/**
 * Removes duplicate stocks, keeping the one with higher volume
 * @param stocks - Array of stocks that may contain duplicates
 * @returns Deduplicated array of stocks
 */
export function deduplicate(stocks: StockItem[]): StockItem[] {
  const stockMap = new Map<string, StockItem>();

  for (const stock of stocks) {
    const existing = stockMap.get(stock.symbol);
    const currentVolume = stock.volume ?? 0;
    const existingVolume = existing?.volume ?? 0;

    if (!existing || currentVolume > existingVolume) {
      stockMap.set(stock.symbol, stock);
    }
  }

  return Array.from(stockMap.values());
}
