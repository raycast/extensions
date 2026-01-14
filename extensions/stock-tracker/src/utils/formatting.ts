import { StockItem, WatchlistItem } from "../types";

export function formatLargeNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return "N/A";

  const numStr = typeof num === "string" ? num : String(num);
  const numValue = typeof num === "number" ? num : parseFloat(numStr);

  if (isNaN(numValue)) return numStr;

  if (Math.abs(numValue) > Number.MAX_SAFE_INTEGER) {
    try {
      const bigInt = BigInt(Math.floor(Math.abs(numValue)));
      return bigInt.toLocaleString("en-US");
    } catch {
      return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  }

  return numValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

function formatVolumeUnit(value: number, unit: string): string {
  return `${value.toFixed(2).replace(/\.?0+$/, "")}${unit}`;
}

export function formatVolume(volume: number | undefined): string {
  if (volume === undefined) return "N/A";

  const absVolume = Math.abs(volume);
  const maxDisplayLength = 6;

  if (absVolume >= 1e12) {
    return formatVolumeUnit(Math.round((absVolume / 1e12) * 100) / 100, "T");
  }
  if (absVolume >= 1e9) {
    return formatVolumeUnit(Math.round((absVolume / 1e9) * 100) / 100, "B");
  }
  if (absVolume >= 1e6) {
    return formatVolumeUnit(Math.round((absVolume / 1e6) * 100) / 100, "M");
  }
  if (absVolume >= 1e3) {
    return formatVolumeUnit(Math.round((absVolume / 1e3) * 100) / 100, "K");
  }

  const rounded = Math.round(absVolume).toString();
  return rounded.length > maxDisplayLength ? rounded.substring(0, maxDisplayLength) : rounded;
}

function formatPriceWithDecimals(price: number, minDecimals: number, maxDecimals: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

function formatSmallPrice(price: number): string {
  const significantDigits = 6;
  const magnitude = Math.floor(Math.log10(Math.abs(price)));
  const decimals = Math.max(2, significantDigits - magnitude - 1);
  return formatPriceWithDecimals(price, Math.min(decimals, 6), Math.min(decimals, 6));
}

export function formatPrice(stock: StockItem | WatchlistItem, customPrice?: number, naText?: string): string {
  const price = customPrice ?? stock.price;
  if (price === undefined) return naText ?? "N/A";

  let formatted: string;
  if (price >= 1) {
    formatted = formatPriceWithDecimals(price, 2, 2);
  } else if (price >= 0.01) {
    formatted = formatPriceWithDecimals(price, 2, 4);
  } else {
    formatted = formatSmallPrice(price);
  }

  const maxLength = 14;
  return formatted.length > maxLength ? formatted.substring(0, maxLength - 1) + "…" : formatted;
}

export function formatMarket(market?: string): string {
  if (!market) return "N/A";
  return `${market.charAt(0).toUpperCase()}${market.slice(1)}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 1)}…`;
}

export function formatFixedWidth(text: string, width: number): string {
  if (text.length > width) {
    return `${text.substring(0, width - 1)}…`;
  }
  return text;
}
