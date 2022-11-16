import { Currency, Locale } from "./types";

export function format_currency(n: number, currency: Currency): string {
  const locale = locale_for_currency(currency);
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  return formatter.format(n / 100);
}

export function locale_for_currency(currency: Currency): Locale {
  if (currency === "EUR") return "es-ES";
  else if (currency === "GBP") return "en-GB";
  else return "en-US";
}
