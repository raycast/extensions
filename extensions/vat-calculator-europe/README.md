# VAT Calculator

A Raycast extension that calculates VAT both ways across European VAT rates —
the entered amount can be either a net or a gross price.

## Usage

Run the **Calculate VAT** command, enter an amount, and pick a country. Because
the amount is ambiguous, the list shows both interpretations, grouped:

- **If net → gross:** treats the input as a net price and adds VAT for each of
  the country's rates (reduced, standard, and any special rates).
- **If gross → net:** treats the input as a gross price and removes VAT for
  each rate.

Press `↵` on an entry to copy its value to the clipboard.

- **Amount input:** the search bar doubles as a live input — change the number
  and both groups recalculate instantly.
- **Decimal/thousands separators:** both `,` and `.` are accepted, so
  `1.234,56` and `1,234.56` both work. Amounts are displayed in the selected
  country's locale and currency (e.g. `1.234,56 €`, `1'234.50 CHF`).
- **Country:** choose it from the dropdown in the search bar. The launch
  argument only seeds the initial selection.
- **Fallback command:** can be configured as a Raycast fallback command — type
  a number in root search and the typed value is used as the amount.

## VAT data

All countries and rates live in [`vat.json`](./vat.json) — the single source of
truth. Each country defines its `currency`, `currencySymbol`, `locale`, and rate
groups. The search-bar dropdown is built from this file at runtime; the
launch-argument dropdown in `package.json` is generated from it at build time
via `scripts/sync-countries.mjs` (`npm run sync:countries`, also run
automatically on `predev` / `prebuild`).

> VAT rates change over time. The values in `vat.json` reflect a recent
> snapshot and should be verified against an official source before relying on
> them for billing.

### Planned: API integration

A future version will load VAT rates from an external API instead of the static
`vat.json`, so rates stay accurate and countries can be added or removed without
a release. The UI is already prepared for this: country selection and rate
lookup go through `getCountries()` / `findCountry()` in `src/vat.ts`, so swapping
the file for an API call only touches that module — the command view stays the
same.

## Development

```sh
npm install
npm run dev     # start Raycast in development mode
npm run build   # build the extension
npm run lint    # lint (use npm run fix-lint to auto-fix)
```
