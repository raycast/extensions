import { StockItem } from "../../types";
import { API_CONSTANTS } from "../../constants";
import { normalizeTurkishChars } from "../../utils/text-helpers";
import { MARKETS } from "./constants";
import { fetchMarket } from "./api-client";
import { deduplicate } from "./data-processing";

// ============================================================================
// Public API
// ============================================================================

/**
 * Searches for stocks across all markets using TradingView API
 * Performs parallel searches in both name and description fields
 * @param query - Search query string (minimum 2 characters)
 * @returns Promise resolving to array of matching StockItem objects
 */
export async function searchStocks(query?: string): Promise<StockItem[]> {
  if (!query || query.trim().length < API_CONSTANTS.MIN_QUERY_LENGTH) {
    return [];
  }

  const normalizedQuery = normalizeTurkishChars(query.trim());

  // Search both name and description separately (API doesn't support OR in filter)
  const searchPromises: Promise<StockItem[]>[] = [
    ...MARKETS.map((market) => fetchMarket(market, normalizedQuery, false)), // name search
    ...MARKETS.map((market) => fetchMarket(market, normalizedQuery, true)), // description search
  ];

  const results = await Promise.allSettled(searchPromises);
  const allStocks = results
    .filter((r): r is PromiseFulfilledResult<StockItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const { filterStocksByQuery, sortStocksByRelevance } = await import("../../utils/filter-helpers");
  const filtered = filterStocksByQuery(allStocks, normalizedQuery);
  const deduplicated = deduplicate(filtered);
  return sortStocksByRelevance(deduplicated, normalizedQuery);
}
