import currencies from './currencies.json';
import { getPreferenceValues } from '@raycast/api';

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  category: string;
}

interface Preferences {
  currency: string;
}

export function getPreferredCurrency(): Currency {
  const { currency: perference } = getPreferences();

  const currency = currencies.find(({ id }) => id === perference);

  if (currency === undefined) {
    throw new Error(''); // TODO
  }

  return currency;
}

export function getCurrencies(): Currency[] {
  return currencies;
}

export function formatPrice(price: number) {
  const currency = getPreferredCurrency();
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.symbol,
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
