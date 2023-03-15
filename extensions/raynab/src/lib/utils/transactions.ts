import { CurrencyFormat } from '@srcTypes';
import { utils } from 'ynab';
import { isNumber } from './validation';

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
  if (typeof amount === 'number' || isNumber(amount)) {
    return Number(amount) * 1000;
  } else {
    throw new Error(`Amount (${amount}) cannot be converted to a number`);
  }
}

/**
 * Get the current month according to the UTC time zone.
 */
export function getCurrentMonth(): string {
  return new Intl.DateTimeFormat('en-us', { month: 'long', timeZone: 'UTC' }).format(new Date());
}

function formatCurrencyPlacement(amount: string, symbol: string, symbol_first: boolean, shouldPrefixSymbol: boolean) {
  if (symbol_first) {
    return shouldPrefixSymbol ? `-${symbol}${amount.substring(1)}` : `${symbol}${amount}`;
  } else {
    return `${amount}${symbol}`;
  }
}
