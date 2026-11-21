# Geneh for Raycast

Egypt's bank exchange rates, gold and silver prices on the Mac keyboard, from the public Geneh feed (data.geneh.app).
No account or API key.

## Commands

- **Exchange Rates**: every currency with the lowest sell (the cheapest place to buy) and the highest buy (the best
  place to sell). Enter shows every bank, with the Central Bank on its own row. The Central Bank is a reference and is
  never marked as a best rate.
- **Gold and Silver Prices**: gold per gram for 24, 22, 21, 18 and 14 karat, the gold pound, silver by purity and the
  world ounce price.
- **Convert to Egyptian Pounds**: type `100 USD`, `$1,299`, `50 €` or `١٠٠ دولار` to see it in EGP at the Central
  Bank rate, at the best bank to sell to and at the cheapest bank to buy from.

The Language setting switches names and numbers to Arabic, with Arabic-Indic digits.

## Working on it

This folder is outside the pnpm workspace because the Raycast Store builds it with npm on its own. It keeps a copy of
`packages/lite/src/lite.js` and `lite.d.ts`; `packages/lite` tests fail until the copies match, so after changing
lite run `cp packages/lite/src/lite.* apps/raycast/src/`.

```sh
cd apps/raycast
npm install
npm run dev      # opens the commands in Raycast (macOS)
npm test         # parser and copy checks
npm run lint     # Raycast's manifest, ESLint and Prettier checks
npm run publish  # opens the Raycast Store pull request
```

Flags and bank logos in `assets/` are copies of `apps/web/public/img/flags` and `apps/web/public/img/banks`.
