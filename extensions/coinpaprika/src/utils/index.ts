import { DEFAULT_CURRENCY_CRYPTO, DEFAULT_CURRENCY_FIAT, DEFAULT_LOCALE } from "../enum";

export function FormatPrice(price: number, currency?: string) {
  let maximumFractionDigits = 4;
  let formattedPrice;
  let display = "symbol";

  if (currency === DEFAULT_CURRENCY_CRYPTO) {
    display = "name";
    maximumFractionDigits = 6;
  }

  currency = currency ?? DEFAULT_CURRENCY_FIAT;

  try {
    const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "currency",
      currency,
      maximumFractionDigits,
      currencyDisplay: display,
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

export function FormatDate(date: string) {
  //avoid 1970 timestamp
  date = date
    ? new Date(date).toLocaleDateString(DEFAULT_LOCALE, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : " / ";

  return date;
}
