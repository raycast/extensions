# UniRate Currency

Convert currencies and look up exchange rates for **any date back to 1999** from inside Raycast, powered by [UniRateAPI](https://unirateapi.com).

## Why this extension

UniRate Currency brings UniRateAPI's forex tools into Raycast with fast access to live rates, conversions, and historical lookups (for supported plans), all through a consistent command UI.

## Commands

### Convert Currency

A form with **From** / **To** dropdowns, an amount field, and an optional historical date.

- Tick **Historical** to pick a date back to 4 January 1999.
- `⌘ ⇧ S` swaps the From/To pair.
- `⌘ C` copies the result.

### Latest Rates

A list view of the latest rates against a base currency. Search by ISO code, copy the rate, or press `⌘ B` on any row to make that currency the new base.

## Setup

1. Sign up for a free key at <https://unirateapi.com/register>.
2. Open the extension preferences and paste it under **UniRate API Key**.

### Plan limits (UniRateAPI)

- **Free tier:** latest forex rates and "today" conversions, with request limits (currently 200/day, 6,000/month).
- **Pro tier required:** all historical data access (including historical forex back to 4 January 1999) and commodities/precious-metals rates.

If you try a Pro-only feature with a free key, the extension shows a clear "Pro plan required" toast.

## Preferences

| Preference            | What it does                                     | Default |
| --------------------- | ------------------------------------------------ | ------- |
| UniRate API Key       | Your key from `unirateapi.com/register`          | —       |
| Default Base Currency | Three-letter ISO code used as the initial _From_ | `USD`   |
| Decimals              | Decimal places shown for converted amounts       | `4`     |

## Disclosure

This extension is built and maintained by the UniRateAPI team.
