import { TradingViewScannerResponse, StockItem, Market } from "../../types";
import { API_CONSTANTS } from "../../constants";
import { createRequest } from "./request-builder";
import { parseResponse } from "./response-parser";

// ============================================================================
// API Client
// ============================================================================

/**
 * Fetches stock data from TradingView API for a specific market
 * @param market - Market identifier
 * @param query - Optional search query
 * @param useDescription - Whether to search in description field
 * @returns Promise resolving to array of StockItem objects
 */
export async function fetchMarket(
  market: Market,
  query?: string,
  useDescription: boolean = false,
): Promise<StockItem[]> {
  try {
    const url = `${API_CONSTANTS.BASE_URL}/${market}/scan`;
    const requestBody = createRequest(query, useDescription);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return [];
    }

    const jsonData = (await response.json()) as TradingViewScannerResponse;
    return parseResponse(jsonData, market);
  } catch {
    // Silently fail for individual market requests to allow other markets to succeed
    return [];
  }
}
