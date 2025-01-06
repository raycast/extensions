import { CurrencyFormat } from '@srcTypes';
import { ScheduledTransactionDetailFrequencyEnum, utils } from 'ynab';
import { isNumberLike } from './validation';

/**
 * Format a YNAB currency amount with optional currency formatting.
 * @see https://api.ynab.com/#formats
 * @param amount - The amount in milliunits (e.g. 1234560 for $1,234.56)
 * @param currency - Optional currency format configuration
 * @param locale - Whether to format with locale-specific number formatting (default: true)
 * @param prefixNegativeSign - Whether to place negative sign before currency symbol (default: true)
 * @returns The formatted string (e.g. "$1,234.56", "-$1,234.56", "1,234.56", or "1234.56")
 */
export function formatToReadablePrice({
  amount,
  currency,
  locale = true,
  prefixNegativeSign = true,
}: {
  amount: number;
  currency?: CurrencyFormat;
  locale?: boolean;
  prefixNegativeSign?: boolean;
}) {
  const fmtAmount = utils.convertMilliUnitsToCurrencyAmount(amount, currency?.decimal_digits ?? 2);

  // Using locale string helps format larger numbers with commas
  const localizedAmount = fmtAmount.toLocaleString('en-us');

  if (currency) {
    const { currency_symbol: symbol, symbol_first, display_symbol } = currency;

    // This is an edge case where negative amounts appear as $-X for symbol_first currencies
    // We are prefixing the negative sign so we get -$X for UI consitency and readability
    const shouldPrefixSymbol = prefixNegativeSign && fmtAmount < 0;
    return !display_symbol
      ? localizedAmount
      : formatCurrencyPlacement(localizedAmount, symbol, symbol_first, shouldPrefixSymbol);
  } else {
    return locale ? localizedAmount : fmtAmount.toString();
  }
}

/**
 * Format a number or a valid string input into a currency amount in milliunits.
 */
export function formatToYnabAmount(amount: string | number): number {
  if (typeof amount === 'number' || isNumberLike(amount)) {
    return Number(amount) * 1000;
  } else {
    throw new Error(`Amount (${amount}) cannot be converted to a number`);
  }
}

function formatCurrencyPlacement(amount: string, symbol: string, symbol_first: boolean, shouldPrefixSymbol: boolean) {
  if (symbol_first) {
    return shouldPrefixSymbol ? `-${symbol}${amount.substring(1)}` : `${symbol}${amount}`;
  } else {
    return `${amount}${symbol}`;
  }
}

/**
 * Distributes a total amount evenly across a specified number of items, handling rounding to cents.
 * If the rounded distributions don't sum exactly to the total amount, the difference is added to
 * the first item to ensure the total remains accurate.
 *
 * @param amount - The total amount to distribute (e.g., 100 for $100)
 * @param dividend - The number of items to distribute the amount across
 * @returns An array of numbers representing the distributed amounts, rounded to 2 decimal places
 *
 * @example
 * // Distributing $100 across 3 items
 * autoDistribute(100, 3) // Returns [33.34, 33.33, 33.33]
 */

export function autoDistribute(amount: number, dividend: number): number[] {
  const baseAmount = amount / dividend;
  const roundedAmount = Math.round(baseAmount * 100) / 100;
  const total = roundedAmount * dividend;
  const difference = amount - total;

  if (difference === 0) {
    return Array(dividend).fill(roundedAmount);
  } else {
    const newAmounts = Array(dividend).fill(roundedAmount);
    newAmounts[0] = Math.round((newAmounts[0] + difference) * 100) / 100;
    return newAmounts;
  }
}

/**
 * Formats a YNAB scheduled transaction frequency enum into a human-readable string
 *
 * @param frequency - The frequency enum from the YNAB API (e.g. "everyOtherWeek", "twiceAMonth")
 * @param prefix - Whether to prefix the frequency with "Repeats" (default: true)
 * @returns A formatted string with proper spacing and capitalization (e.g. "Repeats Every-other Week", "Repeats Twice A Month")
 */
export function formatToReadableFrequency(frequency: ScheduledTransactionDetailFrequencyEnum, prefix = true): string {
  const formatted = frequency
    .replace(/([A-Z\d])/g, ' $1') // Add space before capital letters
    .toLowerCase()
    .replace('every other', 'every-other')
    .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter

  if (prefix && frequency === 'never') return 'Never repeats';

  return prefix ? `Repeats ${formatted}` : formatted;
}
