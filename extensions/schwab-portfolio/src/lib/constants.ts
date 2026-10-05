import type { Timeframe } from "../types/quotes";

// Schwab API base URLs
export const SCHWAB_API_BASE = "https://api.schwabapi.com";
export const SCHWAB_TRADER_BASE = `${SCHWAB_API_BASE}/trader/v1`;
export const SCHWAB_MARKET_DATA_BASE = `${SCHWAB_API_BASE}/marketdata/v1`;

// OAuth endpoints
export const SCHWAB_AUTH_URL = "https://api.schwabapi.com/v1/oauth/authorize";
export const SCHWAB_TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";

// Timeframe configurations for price history
export const TIMEFRAMES: Timeframe[] = [
  { label: "1 Day", value: "1D", periodType: "day", period: 1, frequencyType: "minute", frequency: 5 },
  { label: "5 Days", value: "5D", periodType: "day", period: 5, frequencyType: "minute", frequency: 15 },
  { label: "1 Month", value: "1M", periodType: "month", period: 1, frequencyType: "daily", frequency: 1 },
  { label: "3 Months", value: "3M", periodType: "month", period: 3, frequencyType: "daily", frequency: 1 },
  { label: "6 Months", value: "6M", periodType: "month", period: 6, frequencyType: "daily", frequency: 1 },
  { label: "1 Year", value: "1Y", periodType: "year", period: 1, frequencyType: "daily", frequency: 1 },
  { label: "5 Years", value: "5Y", periodType: "year", period: 5, frequencyType: "weekly", frequency: 1 },
];

export function getTimeframe(value: string): Timeframe {
  return TIMEFRAMES.find((t) => t.value === value) ?? TIMEFRAMES[2]; // Default to 1M
}

// Schwab website URLs
export const SCHWAB_WEB_URL = "https://www.schwab.com";
export const SCHWAB_POSITIONS_URL = "https://client.schwab.com/app/accounts/positions/#/";
