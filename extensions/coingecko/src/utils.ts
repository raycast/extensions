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

const DEFAULT_LOCALE = 'en-US';

export function getPreferredCurrency(): Currency {
  const { currency: perference } = getPreferences();

  const currency = currencies.find(({ id }) => id === perference);

  if (currency === undefined) {
    throw new Error(
      `Preferred currency (${perference}) not found, try updating your preferred currency in the extension settings`,
    );
  }

  return currency;
}

export function getCurrencies(): Currency[] {
  return currencies;
}

export function formatPrice(price: number, currency: string) {
  const maximumFractionDigits = 6;

  let formattedPrice;

  try {
    const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits,
    });

    formattedPrice = formatter.format(price);
  } catch {
    const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
      maximumFractionDigits,
    });

    formattedPrice = `${currency.toUpperCase()} ${formatter.format(price)}`;
  }

  return formattedPrice;
}

export function formatDate(date: Date) {
  return date.toLocaleString(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getPreferences() {
  return getPreferenceValues<Preferences>();
}
