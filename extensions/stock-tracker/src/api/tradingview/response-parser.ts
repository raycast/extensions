import { TradingViewScannerResponse, StockItem, Market } from "../../types";
import { ParsedStockData } from "./types";
import { MIN_REQUIRED_COLUMNS } from "./constants";

// ============================================================================
// Response Parsers
// ============================================================================

/**
 * Parses volume value from API response
 * @param volume - Volume value (string or number)
 * @returns Parsed volume number or undefined
 */
export function parseVolume(volume: string | number | undefined): number | undefined {
  if (typeof volume === "number") {
    return volume;
  }

  if (typeof volume === "string") {
    const parsed = parseFloat(volume.replace(/,/g, ""));
    return isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

/**
 * Extracts stock name from API response data
 * Prefers description over name field
 * @param name - Name field value
 * @param description - Description field value
 * @returns Stock name string or undefined
 */
export function extractStockName(
  name: string | number | undefined,
  description: string | number | undefined,
): string | undefined {
  if (typeof description === "string" && description.trim()) {
    return description;
  }

  if (typeof name === "string" && name.trim()) {
    return name;
  }

  return undefined;
}

/**
 * Parses raw API response data into StockItem objects
 * @param data - TradingView API response
 * @param market - Market identifier
 * @returns Array of parsed StockItem objects
 */
export function parseResponse(data: TradingViewScannerResponse, market: Market): StockItem[] {
  if (!data?.data?.length) {
    return [];
  }

  return data.data
    .filter((item) => item.s && item.d?.length >= MIN_REQUIRED_COLUMNS)
    .map((item) => {
      const [name, description, close, change, changeAbs, volume, recommend, exchange, currency] =
        item.d as ParsedStockData;

      return {
        symbol: item.s,
        name: extractStockName(name, description),
        price: typeof close === "number" ? close : undefined,
        change: typeof changeAbs === "number" ? changeAbs : undefined,
        changePercent: typeof change === "number" ? change : undefined,
        volume: parseVolume(volume),
        recommend: typeof recommend === "number" ? recommend : undefined,
        exchange: typeof exchange === "string" ? exchange : undefined,
        currency: typeof currency === "string" ? currency : undefined,
        market,
      };
    });
}
