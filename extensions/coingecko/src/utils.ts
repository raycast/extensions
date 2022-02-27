import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  currency: Currency;
}

export type Currency = 'usd' | 'eur' | 'gbp' | 'jpy' | 'cny' | 'rub';

export const currencies: Currency[] = [
  'usd',
  'eur',
  'gbp',
  'jpy',
  'cny',
  'rub',
];

export function getCurrency(): Currency {
  const { currency } = getPreferences();
  return currency;
}

export function formatPrice(price: number) {
  const currencyMap: Record<Currency, string> = {
    usd: 'USD',
    eur: 'EUR',
    gbp: 'GBP',
    jpy: 'JPY',
    cny: 'CNY',
    rub: 'RUB',
  };
  const currency = getCurrency();
  const currencyString = currencyMap[currency];
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyString,
    maximumFractionDigits: 6,
  });
  const priceString = currencyFormatter.format(price);
  return priceString;
}

export function formatDate(date: Date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getPreferences() {
  return getPreferenceValues<Preferences>();
}
