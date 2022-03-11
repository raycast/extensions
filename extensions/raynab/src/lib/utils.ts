import { CurrencyFormat } from '@srcTypes';
import { utils } from 'ynab';

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

export function formatToYnabPrice(price: string | number) {
  return Number(price) * 1000;
}

export function getCurrentMonth() {
  return new Intl.DateTimeFormat('en-us', { month: 'long' }).format(new Date(utils.getCurrentDateInISOFormat()));
}

const IS_NUMBER_REGEX = /^[+-]?\d+(\.\d+)?$/g;
export function isNumber(v: string) {
  if (Number.isNaN(Number(v))) return false;

  if (!IS_NUMBER_REGEX.test(v)) return false;

  return true;
}

function formatCurrencyPlacement(amount: string, symbol: string, symbol_first: boolean, shouldPrefixSymbol: boolean) {
  if (symbol_first) {
    return shouldPrefixSymbol ? `-${symbol}${amount.substring(1)}` : `${symbol}${amount}`;
  } else {
    return `${amount}${symbol}`;
  }
}
