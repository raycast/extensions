import { getAssetPrecisionSync, getQuoteAssetSync } from "./api";

// ============ Quote Asset Helpers ============

/**
 * Re-export getQuoteAssetSync for external use.
 * Returns quote asset from exchangeInfo cache.
 */
export { getQuoteAssetSync as getQuoteAsset } from "./api";

/**
 * Extract base asset from a trading symbol (e.g., BTCUSDT -> BTC).
 */
export function extractBaseAsset(symbol: string): string {
  const quoteAsset = getQuoteAssetSync(symbol);
  if (quoteAsset) {
    return symbol.slice(0, -quoteAsset.length);
  }
  // For COIN-M futures like BTCUSD_PERP
  if (symbol.includes("_")) {
    return symbol.split("_")[0].replace("USD", "");
  }
  return symbol;
}

// ============ Formatting Types ============

export type FormatType = "number" | "usd" | "crypto" | "percent" | "volume" | "price";

export interface FormatOptions {
  /** Type of formatting to apply */
  type: FormatType;
  /** Asset symbol for crypto formatting (uses precision from exchangeInfo) */
  asset?: string;
  /** Use compact format (e.g., 1.5K, 2.3M) for USD/volume */
  compact?: boolean;
  /** Override default precision (decimal places) */
  precision?: number;
  /** Show + sign for positive values (for percent/change) */
  showSign?: boolean;
  /** Use thousand separators (default: false for number/crypto, true for usd/price) */
  useGrouping?: boolean;
}

// ============ Core Formatting ============

/**
 * Get the precision (decimal places) for a crypto asset.
 * Uses cached data from exchangeInfo, falls back to defaults.
 */
export function getAssetPrecision(asset: string): number {
  return getAssetPrecisionSync(asset);
}

/**
 * Parse a value to number, handling string | number | undefined.
 */
function parseValue(value: string | number | undefined): number {
  if (value === undefined || value === null) return NaN;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num;
}

/**
 * Get the precision (decimal places) from a numeric string value.
 * Infers precision from the number of decimal places in the original value.
 */
function getPrecisionFromValue(value: string | undefined): number {
  if (!value) return 8;
  const parts = value.split(".");
  return parts.length > 1 ? parts[1].length : 0;
}

/**
 * Unified formatting function for all numeric display needs.
 *
 * @example
 * formatAmount(123.456, { type: "number" }) // "123.456"
 * formatAmount(1234.56, { type: "usd" }) // "$1,234.56"
 * formatAmount(1234567, { type: "usd", compact: true }) // "$1.23M"
 * formatAmount(0.00123456, { type: "crypto", asset: "BTC" }) // "0.00123456"
 * formatAmount(5.67, { type: "percent", showSign: true }) // "+5.67%"
 * formatAmount(1500000, { type: "volume" }) // "$1.50M"
 */
export function formatAmount(value: string | number | undefined, options: FormatOptions): string {
  const num = parseValue(value);
  if (isNaN(num)) return "0";

  const { type, asset, compact = false, precision, showSign = false, useGrouping } = options;

  switch (type) {
    case "number": {
      const decimals = precision ?? (typeof value === "string" ? getPrecisionFromValue(value) : 8);
      if (num === 0) return "0";

      if (useGrouping) {
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(num);
      }

      return num.toFixed(decimals);
    }

    case "price": {
      // Price: number with thousand separators, no currency symbol
      const decimals = precision ?? 2;
      if (num === 0) return "0";
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    }

    case "usd": {
      if (compact) {
        if (Math.abs(num) >= 1_000_000_000) {
          return `$${(num / 1_000_000_000).toFixed(2)}B`;
        }
        if (Math.abs(num) >= 1_000_000) {
          return `$${(num / 1_000_000).toFixed(2)}M`;
        }
        if (Math.abs(num) >= 10_000) {
          return `$${(num / 1_000).toFixed(1)}K`;
        }
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: precision ?? 2,
        maximumFractionDigits: precision ?? 2,
      }).format(num);
    }

    case "crypto": {
      const decimals = precision ?? (asset ? getAssetPrecision(asset) : 8);
      if (num === 0) return "0";
      return num.toFixed(decimals);
    }

    case "percent": {
      const sign = showSign && num > 0 ? "+" : "";
      return `${sign}${num.toFixed(precision ?? 2)}%`;
    }

    case "volume": {
      // Volume always uses compact USD format for readability
      if (Math.abs(num) >= 1_000_000_000) {
        return `$${(num / 1_000_000_000).toFixed(2)}B`;
      }
      if (Math.abs(num) >= 1_000_000) {
        return `$${(num / 1_000_000).toFixed(2)}M`;
      }
      if (Math.abs(num) >= 1_000) {
        return `$${(num / 1_000).toFixed(2)}K`;
      }
      return formatAmount(num, { type: "usd" });
    }

    default:
      return String(num);
  }
}
