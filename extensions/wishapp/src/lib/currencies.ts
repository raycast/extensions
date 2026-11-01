import { currencies as allCurrencies } from "country-data-list";

export type Currency = {
  code: string;
  name: string;
};

// The web app's hidden and added codes (`lib/currencies.ts`): retired or
// non-cash codes the package still lists, and current ones it lacks. The
// server rejects anything not in CURRENCIES
const HIDDEN = new Set([
  "BGN",
  "HRK",
  "LTL",
  "LVL",
  "EEK",
  "CUC",
  "MRO",
  "SLL",
  "STD",
  "VEF",
  "ANG",
  "BOV",
  "CHE",
  "CHW",
  "CLF",
  "COU",
  "MXV",
  "UYI",
  "USS",
  "USN",
]);

const ADDED: Currency[] = [
  { code: "MRU", name: "Mauritanian Ouguiya" },
  { code: "SLE", name: "Sierra Leonean Leone" },
  { code: "VES", name: "Venezuelan Bolívar" },
  { code: "XCG", name: "Caribbean Guilder" },
  { code: "ZWG", name: "Zimbabwe Gold" },
];

const NAME_OVERRIDES: Record<string, string> = {
  USD: "US Dollar",
  GBP: "British Pound",
};

// Same rules as the web app's `lib/currencies.ts`: currencies with a code,
// name and symbol, minus HIDDEN, plus ADDED, sorted by name. The symbol is only
// a filter here, never displayed, so it isn't kept.
export const CURRENCIES: Currency[] = [
  ...allCurrencies.all
    .filter(({ code, name, symbol }) => code && name && symbol && !HIDDEN.has(code))
    .map(({ code, name }) => ({ code, name: NAME_OVERRIDES[code] ?? name })),
  ...ADDED,
].sort((a, b) => a.name.localeCompare(b.name));
