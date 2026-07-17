import { currencies as allCurrencies } from "country-data-list";

export type Currency = {
  code: string;
  name: string;
};

const NAME_OVERRIDES: Record<string, string> = {
  USD: "US Dollar",
  GBP: "British Pound",
};

// Mirrors the web app's `components/ui/currency-select.tsx`: keep currencies
// that have a code, name and symbol, dedupe by code, tidy a couple of major
// names, then sort by name so both clients show an identical list. The symbol
// is only ever a filter here, never displayed, so it isn't kept.
export const CURRENCIES: Currency[] = (() => {
  const byCode = new Map<string, Currency>();

  for (const { code, name, symbol } of allCurrencies.all) {
    if (!code || !name || !symbol) continue;
    byCode.set(code, { code, name: NAME_OVERRIDES[code] ?? name });
  }

  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

export const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));
