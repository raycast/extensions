import { TradingViewScannerRequest } from "../../types";
import { API_CONSTANTS } from "../../constants";
import { COLUMNS } from "./constants";

// ============================================================================
// Request Builder
// ============================================================================

/**
 * Creates a TradingView scanner request payload
 * @param query - Optional search query
 * @param useDescription - Whether to search in description field instead of name
 * @returns TradingView scanner request object
 */
export function createRequest(query?: string, useDescription: boolean = false): TradingViewScannerRequest {
  const baseRequest: TradingViewScannerRequest = {
    columns: [...COLUMNS],
    sort: {
      sortBy: API_CONSTANTS.DEFAULT_SORT_BY,
      sortOrder: API_CONSTANTS.DEFAULT_SORT_ORDER,
    },
    range: [0, API_CONSTANTS.MAX_RESULTS] as const,
    options: { lang: API_CONSTANTS.DEFAULT_LANGUAGE },
  };

  if (!query) {
    return { ...baseRequest, filter: [] };
  }

  return {
    ...baseRequest,
    filter: [
      {
        left: useDescription ? "description" : "name",
        operation: "match",
        right: query,
      },
    ],
  };
}
