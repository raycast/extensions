# UniRate Currency

Convert currencies and look up exchange rates for **any date back to 1999** from inside Raycast, powered by [UniRateAPI](https://unirateapi.com).

## Why this extension

Most currency extensions either need a paid plan for historical rates or stop at last year. UniRate Currency exposes the same `convert` and `rates` surface for both today's rates *and* any historical date — same UI, no upsell.

## Commands

### Convert Currency

A form with **From** / **To** dropdowns, an amount field, and an optional historical date.

- Tick **Historical** to pick a date back to 4 January 1999.
- `⌘ ⇧ S` swaps the From/To pair.
- `⌘ C` copies the result.

### Latest Rates

A list view of the latest rates against a base currency. Search by ISO code, copy the rate, or press `⌘ B` on any row to make that currency the new base.

## Setup

1. Sign up for a free key at <https://unirateapi.com/dashboard>.
2. Open the extension preferences and paste it under **UniRate API Key**.

The free tier is enough for the **Latest Rates** command and for "today" conversions. Historical conversions and commodities require a Pro key (the extension surfaces a clear "Pro plan required" toast if you try them on a free key).

## Preferences

| Preference | What it does | Default |
|---|---|---|
| UniRate API Key | Your key from `unirateapi.com/dashboard` | — |
| Default Base Currency | Three-letter ISO code used as the initial *From* | `USD` |
| Decimals | Decimal places shown for converted amounts | `4` |

## Disclosure

This extension is built and maintained by the UniRateAPI team.
