/**
 * Application-wide constants
 */

// Storage Keys
export const STORAGE_KEYS = {
  WATCHLISTS: "watchlists",
  LAST_WATCHLIST_ID: "lastUsedWatchlistId",
  APP_SETTINGS: "app_settings",
} as const;

// API Constants
export const API_CONSTANTS = {
  BASE_URL: "https://scanner.tradingview.com",
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 100,
  DEFAULT_LANGUAGE: "en",
  DEFAULT_SORT_BY: "volume",
  DEFAULT_SORT_ORDER: "desc" as const,
  MIN_REQUIRED_COLUMNS: 8,
} as const;

// Column Types
export const COLUMN_TYPES = ["price", "change", "changeAbs", "volume", "exchange", "market"] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];

// Form Field IDs
export const FORM_FIELD_IDS = {
  NAME: "name",
} as const;

// Display Constants
export const DISPLAY_CONSTANTS = {
  MAX_TITLE_LENGTH: 100,
  MAX_SUBTITLE_LENGTH: 100,
  MAX_PRICE_LENGTH: 14,
  COLUMN_WIDTHS: {
    price: 14,
    change: 10,
    changeAbs: 12,
    volume: 10,
    exchange: 6,
    market: 10,
  } as const,
} as const;
