# MemRadar Changelog

## [Initial Version] - 2026-09-21

### Added

- `Search Memory Prices`: search tracked RAM and SSD products by name, brand or ASIN. Rows show the current price and buy state; Enter opens the product's price history, with the all-time low and high and the dates they were set, the 90-day average, tracked days, and the monthly prices. Long-running products show recent months in full and one line per earlier year.
- `Show Market Overview`: DDR5, DDR4, NVMe and SATA with their median price, median price per gigabyte, and the change over one month, three months, six months and a year, each stating the number of products it was measured across.
- Both commands show the date their data was computed and warn when it is more than three days old. Data is cached for four hours; Refresh forces a new request. If a request fails, the last cached data is shown with its date rather than an empty list.
