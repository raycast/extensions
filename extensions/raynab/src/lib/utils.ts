import { utils } from 'ynab';

export function formatToReadablePrice(price: number, locale = true) {
  const fmtPrice = utils.convertMilliUnitsToCurrencyAmount(price, 2);
  return locale ? fmtPrice.toLocaleString('en-us') : fmtPrice.toString();
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
