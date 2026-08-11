/**
 * Constants and lookup tables for Portfolio Tracker.
 *
 * Pure data — no logic, no imports from other project files.
 * Used across components, hooks, and services for consistent display and config.
 */

import { Color } from "@raycast/api";
import { AccountType, AssetType, SortField, SortDirection, SortOption } from "./types";

/**
 * Casts a hex string to `Color` for use in Raycast API props.
 *
 * Raycast accepts hex strings at runtime (they are `Color.Raw`), but some
 * component props (e.g. `List.Item.Accessory.text.color`) are typed as
 * `Color` (the enum) rather than `Color.ColorLike`. This helper bridges
 * the gap so we can use our custom palette hex values without type errors.
 */
function asColor(hex: string): Color {
  return hex as unknown as Color;
}

// ──────────────────────────────────────────
// App Color Palette (custom hexes)
// ──────────────────────────────────────────

export const APP_COLOR_PALETTE = {
  mint: "#B9E3C6",
  teal: "#59C9A5",
  rose: "#D81E5B",
  navy: "#23395B",
  butter: "#FFFD98",
} as const;

/** Semantic colors for consistent UI accents */
export const COLOR_PRIMARY = asColor(APP_COLOR_PALETTE.navy);
export const COLOR_MUTED = asColor(APP_COLOR_PALETTE.mint);
export const COLOR_WARNING = asColor(APP_COLOR_PALETTE.butter);
export const COLOR_DESTRUCTIVE = asColor(APP_COLOR_PALETTE.rose);

// ──────────────────────────────────────────
// Account Type Display Labels
// ──────────────────────────────────────────

/** Human-readable labels for each AccountType */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.ISA]: "ISA",
  [AccountType.LISA]: "LISA",
  [AccountType.SIPP]: "SIPP / Pension",
  [AccountType.GIA]: "General Investment",
  [AccountType.BROKERAGE]: "Brokerage",
  [AccountType._401K]: "401(k)",
  [AccountType.CRYPTO]: "Crypto",
  [AccountType.CURRENT_ACCOUNT]: "Current Account",
  [AccountType.SAVINGS_ACCOUNT]: "Savings Account",
  [AccountType.PROPERTY]: "🏡 Property",
  [AccountType.DEBT]: "💰🔻 Debt",
  [AccountType.OTHER]: "Other",
};

/** Ordered list of account types for form dropdowns */
export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, title]) => ({ value, title }));

/** Colour-coded tags for each account type (used in section subtitles) */
export const ACCOUNT_TYPE_COLORS: Record<AccountType, Color> = {
  [AccountType.ISA]: asColor(APP_COLOR_PALETTE.teal),
  [AccountType.LISA]: asColor(APP_COLOR_PALETTE.mint),
  [AccountType.SIPP]: asColor(APP_COLOR_PALETTE.navy),
  [AccountType.GIA]: asColor(APP_COLOR_PALETTE.teal),
  [AccountType.BROKERAGE]: asColor(APP_COLOR_PALETTE.rose),
  [AccountType._401K]: asColor(APP_COLOR_PALETTE.butter),
  [AccountType.CRYPTO]: asColor(APP_COLOR_PALETTE.rose),
  [AccountType.CURRENT_ACCOUNT]: asColor(APP_COLOR_PALETTE.mint),
  [AccountType.SAVINGS_ACCOUNT]: asColor(APP_COLOR_PALETTE.teal),
  [AccountType.PROPERTY]: asColor(APP_COLOR_PALETTE.navy),
  [AccountType.DEBT]: asColor(APP_COLOR_PALETTE.rose),
  [AccountType.OTHER]: asColor(APP_COLOR_PALETTE.navy),
};

// ──────────────────────────────────────────
// Asset Type Display Labels & Icons
// ──────────────────────────────────────────

/** Human-readable labels for asset types */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.EQUITY]: "Stock",
  [AssetType.ETF]: "ETF",
  [AssetType.MUTUALFUND]: "Mutual Fund",
  [AssetType.INDEX]: "Index",
  [AssetType.CURRENCY]: "Currency",
  [AssetType.CRYPTOCURRENCY]: "Cryptocurrency",
  [AssetType.OPTION]: "Option",
  [AssetType.FUTURE]: "Future",
  [AssetType.CASH]: "Cash",
  [AssetType.MORTGAGE]: "Mortgage Property",
  [AssetType.OWNED_PROPERTY]: "Owned Outright",
  [AssetType.CREDIT_CARD]: "💳 Credit Card",
  [AssetType.LOAN]: "🏦 Loan",
  [AssetType.STUDENT_LOAN]: "📚💰 Student Loan",
  [AssetType.AUTO_LOAN]: "🚗 Auto Loan",
  [AssetType.BNPL]: "💳 Buy Now Pay Later",
  [AssetType.UNKNOWN]: "Unknown",
};

// ──────────────────────────────────────────
// Currency Symbols & Configuration
// ──────────────────────────────────────────

/** Maps ISO currency codes to their display symbols */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CHF: "Fr",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  HKD: "HK$",
  SGD: "S$",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  ZAR: "R",
  GBp: "p", // GBP pence — Yahoo uses "GBp" for LSE-listed prices in pence
};

/**
 * Currencies that Yahoo Finance reports in minor units (e.g. pence instead of pounds).
 * We must divide by the given factor to get the major unit.
 *
 * Example: VUSA.L is quoted in GBp (pence). 7245 GBp = £72.45
 */
export const MINOR_CURRENCY_FACTORS: Record<string, { majorCode: string; divisor: number }> = {
  GBp: { majorCode: "GBP", divisor: 100 },
  ILA: { majorCode: "ILS", divisor: 100 }, // Israeli Agorot
  ZAc: { majorCode: "ZAR", divisor: 100 }, // South African cents
};

// ──────────────────────────────────────────
// Cash Position Configuration
// ──────────────────────────────────────────

/** Currency options for the "Add Cash" form dropdown */
export const CASH_CURRENCY_OPTIONS = [
  { value: "GBP", title: "GBP (£)" },
  { value: "USD", title: "USD ($)" },
  { value: "EUR", title: "EUR (€)" },
  { value: "CHF", title: "CHF (Fr)" },
  { value: "JPY", title: "JPY (¥)" },
  { value: "CAD", title: "CAD (C$)" },
  { value: "AUD", title: "AUD (A$)" },
  { value: "SEK", title: "SEK (kr)" },
  { value: "NOK", title: "NOK (kr)" },
  { value: "DKK", title: "DKK (kr)" },
  { value: "HKD", title: "HKD (HK$)" },
  { value: "SGD", title: "SGD (S$)" },
  { value: "CNY", title: "CNY (¥)" },
  { value: "INR", title: "INR (₹)" },
  { value: "BRL", title: "BRL (R$)" },
  { value: "ZAR", title: "ZAR (R)" },
];

// ──────────────────────────────────────────
// Cache Configuration
// ──────────────────────────────────────────

/** Cache key prefixes */
export const CACHE_PREFIX = {
  /** Daily price cache: `price:{symbol}:{YYYY-MM-DD}` */
  PRICE: "price",
  /** Daily FX rate cache: `fx:{from}:{to}:{YYYY-MM-DD}` */
  FX_RATE: "fx",
  /** HPI cache: `hpi:{region}:{YYYY-MM}` (monthly data, checked daily) */
  HPI: "hpi",
  /** Postcode-to-region mapping cache: `postcode-region:{postcode}` (stable, no date) */
  POSTCODE_REGION: "postcode-region",
  /** Debt repayment log: `debt-repayments` (persisted, no date) */
  DEBT_REPAYMENTS: "debt-repayments",
} as const;

/** Cache capacity in bytes (5 MB — well within Raycast's 10 MB default) */
export const CACHE_CAPACITY_BYTES = 5 * 1024 * 1024;

// ──────────────────────────────────────────
// LocalStorage Keys
// ──────────────────────────────────────────

/** Keys used for Raycast LocalStorage (portfolio persistence) */
export const STORAGE_KEYS = {
  /** The full serialised Portfolio object */
  PORTFOLIO: "portfolio-data",
  /** Debt repayment log — tracks auto-applied monthly repayments */
  DEBT_REPAYMENTS: "debt-repayments",
  /** Flag set to "true" when the user dismisses the sample portfolio.
   *  Prevents auto-loading the sample again on subsequent launches. */
  SAMPLE_DISMISSED: "sample-dismissed",
} as const;

// ──────────────────────────────────────────
// API / Search Configuration
// ──────────────────────────────────────────

/** Debounce delay (ms) for type-ahead search input */
export const SEARCH_DEBOUNCE_MS = 350;

/** Maximum search results to display */
export const SEARCH_MAX_RESULTS = 20;

/** Request timeout for Yahoo Finance calls (ms) */
export const API_TIMEOUT_MS = 10_000;

// ──────────────────────────────────────────
// Display / Formatting Configuration
// ──────────────────────────────────────────

/** Number of decimal places for currency display */
export const CURRENCY_DECIMALS = 2;

/** Number of decimal places for unit display */
export const UNITS_DECIMALS = 4;

/** Number of decimal places for percentage display */
export const PERCENT_DECIMALS = 2;

/** Colour used for positive changes / gains */
export const COLOR_POSITIVE = asColor(APP_COLOR_PALETTE.teal);

/** Colour used for negative changes / losses */
export const COLOR_NEGATIVE = asColor(APP_COLOR_PALETTE.rose);

/** Colour used for neutral / zero changes */
export const COLOR_NEUTRAL = asColor(APP_COLOR_PALETTE.navy);

// ──────────────────────────────────────────
// Sorting Configuration
// ──────────────────────────────────────────

/** Available sort options for the portfolio list dropdown */
export const SORT_OPTIONS: SortOption[] = [
  { field: SortField.VALUE, direction: SortDirection.DESC, label: "Value ↓", key: "value-desc" },
  { field: SortField.VALUE, direction: SortDirection.ASC, label: "Value ↑", key: "value-asc" },
  { field: SortField.CHANGE, direction: SortDirection.DESC, label: "Change ↓", key: "change-desc" },
  { field: SortField.CHANGE, direction: SortDirection.ASC, label: "Change ↑", key: "change-asc" },
];

/** Default sort key (value descending) */
export const DEFAULT_SORT_KEY = "value-desc";

// ──────────────────────────────────────────
// Sample Portfolio
// ──────────────────────────────────────────

/** ID prefix used to identify sample/demo accounts and positions */
export const SAMPLE_ID_PREFIX = "sample-";

// ──────────────────────────────────────────
// Network / Retry Configuration
// ──────────────────────────────────────────

/** HTTP status codes considered "offline" / transient (retryable) */
export const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/** Network error codes considered "offline" (retryable) */
export const OFFLINE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "FETCH_ERROR",
]);
