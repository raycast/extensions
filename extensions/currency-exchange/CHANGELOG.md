# Currency Exchange Changelog

## [Add AllRatesToday provider] - {PR_MERGE_DATE}

- Added "AllRatesToday (ECB reference rates, no key)" as a third Rate Provider option. It needs no API key and serves the ECB daily reference table (~30 currencies, latest only).
- API Key preference is no longer required, since the new provider does not use one.

## [Add UniRateAPI as alternate provider] - 2026-04-29

- Added a "Rate Provider" preference. ExchangeRate-API remains the default; UniRateAPI is selectable as an alternative.
- API key field now applies to whichever provider is selected.

## [Added missing contributor] - 2025-11-25

## [Update] - 2025-11-04

- Toggled on windows support

## [Update] - 2024-10-01

- Add currency formating to all display

## [Upgraded dependencies] - 2023-04-11

## [Update] - 2023-01-02

- Add query based on historical currency new function

## [Update] - 2022-09-20

- Updated currency code and country mapping file
- Fixed an issue which could lead to a crash

## [Initial release] - 2022-06-09
