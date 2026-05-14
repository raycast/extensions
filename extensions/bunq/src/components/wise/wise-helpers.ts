/**
 * Helper functions for wise/TransferWise components.
 */

// Top currencies by global usage/trade volume
export const TOP_CURRENCIES = [
  "USD", // US Dollar
  "EUR", // Euro
  "GBP", // British Pound
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
  "CHF", // Swiss Franc
  "AUD", // Australian Dollar
  "CAD", // Canadian Dollar
  "HKD", // Hong Kong Dollar
  "SGD", // Singapore Dollar
  "NZD", // New Zealand Dollar
  "SEK", // Swedish Krona
  "NOK", // Norwegian Krone
  "DKK", // Danish Krone
  "PLN", // Polish Zloty
];

export interface CurrencyInfo {
  currency: string;
  name?: string;
}

/**
 * Sort currencies with major currencies first, then alphabetically
 */
export function sortCurrencies(currencies: CurrencyInfo[]): CurrencyInfo[] {
  return [...currencies].sort((a, b) => {
    const aIndex = TOP_CURRENCIES.indexOf(a.currency);
    const bIndex = TOP_CURRENCIES.indexOf(b.currency);

    // Both are top currencies - sort by priority
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // Only a is top currency
    if (aIndex !== -1) return -1;
    // Only b is top currency
    if (bIndex !== -1) return 1;
    // Neither is top - sort alphabetically
    return a.currency.localeCompare(b.currency);
  });
}
