/**
 * Formatting utilities for currency, numbers, percentages, and dates.
 *
 * Pure functions with no side effects. Used across components for consistent display.
 * All functions are null-safe and handle edge cases gracefully.
 */

import {
  CURRENCY_SYMBOLS,
  CURRENCY_DECIMALS,
  UNITS_DECIMALS,
  PERCENT_DECIMALS,
  MINOR_CURRENCY_FACTORS,
} from "./constants";
import { Position } from "./types";

// ──────────────────────────────────────────
// Currency Formatting
// ──────────────────────────────────────────

/**
 * Returns the display symbol for a currency code.
 *
 * @param currencyCode - ISO 4217 code, e.g. "GBP", "USD"
 * @returns Symbol string, e.g. "£", "$". Falls back to the code itself if unknown.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
}

/**
 * Formats a numeric value as a currency string.
 *
 * @param amount - The value to format
 * @param currencyCode - ISO 4217 code, e.g. "GBP"
 * @param options - Optional overrides for decimal places and sign display
 * @returns Formatted string, e.g. "£1,234.56", "-$42.10"
 *
 * @example
 * formatCurrency(1234.5, "GBP")     // "£1,234.50"
 * formatCurrency(-42.1, "USD")      // "-$42.10"
 * formatCurrency(0, "EUR")          // "€0.00"
 * formatCurrency(1234.5, "GBP", { showSign: true }) // "+£1,234.50"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options?: { decimals?: number; showSign?: boolean },
): string {
  const decimals = options?.decimals ?? CURRENCY_DECIMALS;
  const showSign = options?.showSign ?? false;

  const absFormatted = formatNumber(Math.abs(amount), decimals);
  const symbol = getCurrencySymbol(currencyCode);

  const sign = amount < 0 ? "-" : showSign && amount > 0 ? "+" : "";

  return `${sign}${symbol}${absFormatted}`;
}

/**
 * Formats a compact currency string for tight spaces (e.g. list accessories).
 * Uses K/M/B suffixes for large values.
 *
 * @param amount - The value to format
 * @param currencyCode - ISO 4217 code
 * @returns Compact string, e.g. "£1.2K", "£3.5M"
 *
 * @example
 * formatCurrencyCompact(850, "GBP")       // "£850"
 * formatCurrencyCompact(1234, "GBP")      // "£1.2K"
 * formatCurrencyCompact(1500000, "USD")   // "$1.5M"
 * formatCurrencyCompact(2300000000, "EUR") // "€2.3B"
 */
export function formatCurrencyCompact(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  }
  if (abs >= 1_000) {
    return `${sign}${symbol}${formatNumber(abs, 0)}`;
  }

  return `${sign}${symbol}${formatNumber(abs, CURRENCY_DECIMALS)}`;
}

// ──────────────────────────────────────────
// Number Formatting
// ──────────────────────────────────────────

/**
 * Formats a number with thousand separators and fixed decimal places.
 *
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string, e.g. "1,234.56"
 *
 * @example
 * formatNumber(1234.5)     // "1,234.50"
 * formatNumber(1234.5, 0)  // "1,235"
 * formatNumber(0.1234, 4)  // "0.1234"
 */
export function formatNumber(value: number, decimals: number = CURRENCY_DECIMALS): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a unit count, showing up to UNITS_DECIMALS decimal places
 * but trimming trailing zeros.
 *
 * @param units - Number of units
 * @returns Formatted string, e.g. "12.5", "100", "0.0025"
 *
 * @example
 * formatUnits(12.5)    // "12.5"
 * formatUnits(100)     // "100"
 * formatUnits(0.0025)  // "0.0025"
 * formatUnits(3.10)    // "3.1"
 */
export function formatUnits(units: number): string {
  // Use fixed decimals then strip trailing zeros
  const fixed = units.toFixed(UNITS_DECIMALS);
  // Remove trailing zeros after decimal point, and the dot if nothing follows
  return fixed.replace(/\.?0+$/, "") || "0";
}

// ──────────────────────────────────────────
// Percentage Formatting
// ──────────────────────────────────────────

/**
 * Formats a percentage value with sign indicator.
 *
 * @param value - Percentage as a number (e.g. 1.25 means 1.25%)
 * @param options - Optional overrides
 * @returns Formatted string, e.g. "+1.25%", "-0.50%", "0.00%"
 *
 * @example
 * formatPercent(1.25)   // "+1.25%"
 * formatPercent(-0.5)   // "-0.50%"
 * formatPercent(0)      // "0.00%"
 */
export function formatPercent(value: number, options?: { decimals?: number; showSign?: boolean }): string {
  const decimals = options?.decimals ?? PERCENT_DECIMALS;
  const showSign = options?.showSign ?? true;

  const sign = value > 0 && showSign ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

// ──────────────────────────────────────────
// Date / Time Formatting
// ──────────────────────────────────────────

/**
 * Formats an ISO 8601 date string as a short human-readable date.
 *
 * @param isoString - ISO 8601 date string
 * @returns Formatted date, e.g. "15 Jul 2025"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats an ISO 8601 date string as a relative time description.
 *
 * @param isoString - ISO 8601 date string
 * @returns Relative time, e.g. "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  return formatDate(isoString);
}

/**
 * Returns today's date as a "YYYY-MM-DD" string.
 * Used as part of cache keys for daily price/FX lookups.
 *
 * @returns Date string, e.g. "2025-07-15"
 */
export function getTodayDateKey(): string {
  return new Date().toISOString().split("T")[0];
}

// ──────────────────────────────────────────
// Display Name Resolution
// ──────────────────────────────────────────

/**
 * Returns the display name for a position, preferring `customName` over the
 * original Yahoo Finance `name`. Use this everywhere a position name is rendered
 * so that user renames are applied consistently.
 *
 * @param position - The position to get the display name for
 * @returns The custom name if set, otherwise the original name
 *
 * @example
 * getDisplayName({ name: "VANGUARD S&P 500 UCITS ETF GBP ACC", customName: "Vanguard S&P 500" })
 * // → "Vanguard S&P 500"
 *
 * getDisplayName({ name: "Apple Inc." })
 * // → "Apple Inc."
 */
export function getDisplayName(position: Pick<Position, "name" | "customName">): string {
  return position.customName?.trim() || position.name;
}

/**
 * Returns `true` if a position has a custom name set (i.e. has been renamed).
 *
 * @param position - The position to check
 */
export function hasCustomName(position: Pick<Position, "customName">): boolean {
  return !!position.customName?.trim();
}

// ──────────────────────────────────────────
// Yahoo Finance Price Normalisation
// ──────────────────────────────────────────

/**
 * Normalises a price and currency from Yahoo Finance, converting minor
 * currency units (e.g. GBp pence) to major units (e.g. GBP pounds).
 *
 * Many LSE-listed securities are quoted in pence (GBp) rather than pounds (GBP).
 * This function detects such cases and divides accordingly.
 *
 * @param price - Raw price from Yahoo Finance
 * @param currency - Raw currency code from Yahoo Finance (e.g. "GBp", "USD")
 * @returns Normalised `{ price, currency }` in major currency units
 *
 * @example
 * normaliseCurrencyPrice(7245, "GBp")  // { price: 72.45, currency: "GBP" }
 * normaliseCurrencyPrice(234.5, "USD") // { price: 234.5, currency: "USD" }
 */
export function normaliseCurrencyPrice(price: number, currency: string): { price: number; currency: string } {
  const minor = MINOR_CURRENCY_FACTORS[currency];
  if (minor) {
    return {
      price: price / minor.divisor,
      currency: minor.majorCode,
    };
  }
  return { price, currency };
}
