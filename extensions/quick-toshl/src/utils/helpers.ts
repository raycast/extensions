/**
 * Standardized AI instructions for tool responses.
 * Ensures consistent language matching across all tools.
 */
export const AI_INSTRUCTIONS =
  "IMPORTANT: Respond in the SAME LANGUAGE as the user's query. If the user asked in Vietnamese, respond in Vietnamese. If they asked in English, respond in English. Format currency amounts with proper separators.";

/**
 * Parse numeric amount.
 * Expects a plain number or string number from AI.
 */
export function parseAmount(input: string | number): number {
  if (typeof input === "number") return input;
  const str = input.toString().replace(/[^0-9.-]/g, "");
  return parseFloat(str) || 0;
}

/**
 * Currency symbol map for common currencies.
 * Symbol position: true = prefix (e.g., $100), false = suffix (e.g., 100€)
 */
export const CURRENCY_SYMBOLS: Record<string, { symbol: string; prefix: boolean }> = {
  // Major currencies
  USD: { symbol: "$", prefix: true },
  EUR: { symbol: "€", prefix: false },
  GBP: { symbol: "£", prefix: true },
  JPY: { symbol: "¥", prefix: true },
  CNY: { symbol: "¥", prefix: true },
  CHF: { symbol: "CHF", prefix: true },

  // Southeast Asia
  VND: { symbol: "₫", prefix: false },
  THB: { symbol: "฿", prefix: true },
  SGD: { symbol: "S$", prefix: true },
  MYR: { symbol: "RM", prefix: true },
  IDR: { symbol: "Rp", prefix: true },
  PHP: { symbol: "₱", prefix: true },

  // Other Asia
  KRW: { symbol: "₩", prefix: true },
  INR: { symbol: "₹", prefix: true },
  HKD: { symbol: "HK$", prefix: true },
  TWD: { symbol: "NT$", prefix: true },

  // Americas
  CAD: { symbol: "C$", prefix: true },
  MXN: { symbol: "MX$", prefix: true },
  BRL: { symbol: "R$", prefix: true },
  ARS: { symbol: "AR$", prefix: true },
  COP: { symbol: "COL$", prefix: true },

  // Oceania
  AUD: { symbol: "A$", prefix: true },
  NZD: { symbol: "NZ$", prefix: true },

  // Europe
  PLN: { symbol: "zł", prefix: false },
  CZK: { symbol: "Kč", prefix: false },
  SEK: { symbol: "kr", prefix: false },
  NOK: { symbol: "kr", prefix: false },
  DKK: { symbol: "kr", prefix: false },
  HUF: { symbol: "Ft", prefix: false },
  RON: { symbol: "lei", prefix: false },
  RUB: { symbol: "₽", prefix: false },
  UAH: { symbol: "₴", prefix: false },
  TRY: { symbol: "₺", prefix: true },

  // Middle East & Africa
  AED: { symbol: "د.إ", prefix: true },
  SAR: { symbol: "﷼", prefix: true },
  ILS: { symbol: "₪", prefix: true },
  ZAR: { symbol: "R", prefix: true },
  EGP: { symbol: "E£", prefix: true },
  NGN: { symbol: "₦", prefix: true },
};

/**
 * Format currency amount with symbol (e.g., $13 instead of 13 USD).
 * For unknown currencies, falls back to suffix format (e.g., 13 XYZ).
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const absAmount = Math.abs(amount);
  const formattedAmount = absAmount.toLocaleString();
  const currencyInfo = CURRENCY_SYMBOLS[currencyCode];

  if (currencyInfo) {
    return currencyInfo.prefix
      ? `${currencyInfo.symbol}${formattedAmount}`
      : `${formattedAmount}${currencyInfo.symbol}`;
  }

  // Fallback: use currency code as suffix
  return `${formattedAmount} ${currencyCode}`;
}

/**
 * Format amount for display with Vietnamese-friendly shortcuts.
 * Uses currency symbols instead of codes.
 */
export function formatDisplayAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  const currencyInfo = CURRENCY_SYMBOLS[currency];
  const symbol = currencyInfo?.symbol || currency;
  const prefix = currencyInfo?.prefix ?? false;

  if (absAmount >= 1000000) {
    const value = `${(absAmount / 1000000).toFixed(1)} triệu`;
    return prefix ? `${symbol}${value}` : `${value}${symbol}`;
  }
  if (absAmount >= 1000) {
    const value = `${(absAmount / 1000).toFixed(0)}k`;
    return prefix ? `${symbol}${value}` : `${value}${symbol}`;
  }

  return formatCurrency(absAmount, currency);
}
