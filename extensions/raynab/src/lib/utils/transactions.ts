import { CurrencyFormat, SaveSubTransactionWithReadableAmounts } from '@srcTypes';
import { ScheduledTransactionDetailFrequencyEnum, utils } from 'ynab';
import { isNumberLike } from './validation';
import { getPreferenceValues } from '@raycast/api';

const preferences = getPreferenceValues<Preferences>();

/**
 * Format a YNAB currency amount with optional currency formatting.
 * @see https://api.ynab.com/#formats
 * @param amount - The amount in milliunits (e.g. 1234560 for $1,234.56)
 * @param currency - Optional currency format configuration
 * @param locale - Whether to format with locale-specific number formatting (default: true)
 * @param prefixNegativeSign - Whether to place negative sign before currency symbol (default: true)
 * @returns The formatted string (e.g. "$1,234.56", "-$1,234.56", "1,234.56", or "1234.56")
 */
export function formatToReadableAmount({
  amount,
  currency,
  locale = true,
  prefixNegativeSign = true,
  includeSymbol = true,
}: {
  amount: number;
  currency?: CurrencyFormat;
  locale?: boolean;
  prefixNegativeSign?: boolean;
  includeSymbol?: boolean;
}) {
  const fmtAmount = utils.convertMilliUnitsToCurrencyAmount(amount, currency?.decimal_digits ?? 2);

  // Using locale string helps format larger numbers with commas
  const localizedAmount = localizeToBudgetSettings(fmtAmount, currency);

  if (currency && includeSymbol) {
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
 * Formats a number according to the budget's currency settings or defaults to US locale.
 *
 * @param fmtAmount - The amount to format (e.g. 1234.56)
 * @param currency - Optional currency format configuration with separators and decimal settings
 * @returns A string with the formatted amount using appropriate separators (e.g. "1,234.56" or "1.234,56")
 *
 * @example
 * // With USD currency format
 * localizeToBudgetSettings(1234.56, {
 *   group_separator: ',',
 *   decimal_separator: '.',
 *   decimal_digits: 2
 * }) // Returns "1,234.56"
 *
 * // Without currency format (defaults to US locale)
 * localizeToBudgetSettings(1234.56) // Returns "1,234.56"
 */
function localizeToBudgetSettings(fmtAmount: number, currency?: CurrencyFormat) {
  if (!currency) {
    return fmtAmount.toLocaleString('en-us');
  }

  const [integerPart, decimalPart] = fmtAmount.toString().split('.');

  // Group integers according to currency format
  const integerGroups = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, currency.group_separator);

  // Combine with decimal part using currency decimal separator
  return !decimalPart
    ? integerGroups
    : `${integerGroups}${currency.decimal_separator}${decimalPart.padEnd(currency.decimal_digits, '0')}`;
}

/**
 * Format a number or a valid string input into a currency amount in milliunits.
 */
export function formatToYnabAmount(amount: string | number, currencyFormat?: CurrencyFormat): number {
  if (typeof amount === 'number') return Number(amount) * 1000;

  const normalizedAmount = currencyFormat
    ? amount.replaceAll(currencyFormat.group_separator, '').replaceAll(currencyFormat.decimal_separator, '.')
    : amount;

  if (isNumberLike(normalizedAmount)) {
    return Number(normalizedAmount) * 1000;
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

export function onSubtransactionAmountChangeHandler({
  subtransactions,
  amount,
  currency,
  setSubtransactions,
}: {
  subtransactions: SaveSubTransactionWithReadableAmounts[];
  amount: string;
  currency: CurrencyFormat;
  setSubtransactions: React.Dispatch<React.SetStateAction<SaveSubTransactionWithReadableAmounts[]>>;
}) {
  return (sub: SaveSubTransactionWithReadableAmounts): ((newValue: string) => void) | undefined => {
    const eventHandler = (newAmount: string) => {
      const oldList = [...subtransactions];
      const previousSubtransactionIdx = oldList.findIndex((s) => s.category_id === sub.category_id);

      if (previousSubtransactionIdx === -1) return;

      const newSubtransaction = { ...oldList[previousSubtransactionIdx], amount: newAmount };
      const newList = [...oldList];
      newList[previousSubtransactionIdx] = newSubtransaction;

      // If there are exactly 2 subtransactions, we can automatically calculate the second amount
      // based on the total transaction amount and the first subtransaction amount
      const isDualSplitTransaction = oldList.length === 2;
      if (isDualSplitTransaction && preferences.liveDistribute) {
        const otherSubTransactionIdx = previousSubtransactionIdx === 0 ? 1 : 0;
        const otherSubTransaction = { ...oldList[otherSubTransactionIdx] };
        let otherAmount: number = NaN;
        try {
          otherAmount = formatToYnabAmount(amount, currency) - formatToYnabAmount(newAmount, currency);
        } catch (error) {
          // The above calc might throw but we don't care much
          // Might be better to debounce it
        }

        if (!Number.isNaN(otherAmount)) {
          otherSubTransaction.amount = formatToReadableAmount({
            amount: otherAmount,
            currency,
            includeSymbol: false,
          });
          newList[otherSubTransactionIdx] = otherSubTransaction;
        }
      }

      setSubtransactions(newList);
    };

    return eventHandler;
  };
}
