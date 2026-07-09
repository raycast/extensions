import { currencies as AllCurrencies } from "country-data-list";

export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

// Mirrors the web app's `components/ui/currency-select.tsx`: keep currencies
// that have a code, name and symbol, dedupe by code, tidy a couple of major
// names, then sort by name so both clients show an identical list.
export const CURRENCIES: Currency[] = (() => {
  const byCode = new Map<string, Currency>();

  for (const currency of AllCurrencies.all) {
    if (!currency.code || !currency.name || !currency.symbol) continue;

    let name = currency.name;
    if (currency.code === "USD") name = "US Dollar";
    else if (currency.code === "GBP") name = "British Pound";

    byCode.set(currency.code, {
      code: currency.code,
      name,
      symbol: currency.symbol,
    });
  }

  return Array.from(byCode.values()).sort((a, b) => a.name.localeCompare(b.name));
})();

export const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));
