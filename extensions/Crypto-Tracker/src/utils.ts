import { getPreferenceValues, Color } from "@raycast/api";

// Get user preferences with defaults
export function getPreferences() {
  const preferences = getPreferenceValues();

  return {
    vsCurrency: preferences.vsCurrency || "usd",
    refreshInterval: parseInt(preferences.refreshInterval || "1", 10),
  };
}

// Get currency symbol based on user preference
export function getCurrencySymbol(currency: string) {
  switch (currency.toLowerCase()) {
    case "usd":
      return "$";
    case "eur":
      return "€";
    case "gbp":
      return "£";
    case "jpy":
      return "¥";
    default:
      return "";
  }
}

// Constants for number formatting
const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;

// Format currency with proper symbol and decimals
export function formatCurrency(
  value: number | undefined,
  vsCurrency: string,
  compact = false,
) {
  if (value === undefined) return "N/A";

  const currencySymbol = getCurrencySymbol(vsCurrency);

  if (compact && value >= BILLION) {
    return `${currencySymbol}${(value / BILLION).toFixed(2)}B`;
  } else if (compact && value >= MILLION) {
    return `${currencySymbol}${(value / MILLION).toFixed(2)}M`;
  } else if (compact && value >= THOUSAND) {
    return `${currencySymbol}${(value / THOUSAND).toFixed(2)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: vsCurrency.toUpperCase(),
    currencyDisplay: "symbol",
    minimumFractionDigits: value < 1 ? 6 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

// Format large numbers with commas
export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

// Format percentage with + or - sign
export function formatPercentage(value: number | undefined) {
  if (value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Determine color based on value
export function getColorForValue(value: number) {
  return value >= 0 ? Color.Green : Color.Red;
}
