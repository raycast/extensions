# Stock Charts Changelog

## [Unreleased]

- Add YTD and 2Y timeframe options (now 9 intervals: 1D, 1W, 1M, 3M, 6M, YTD, 1Y, 2Y, 5Y)
- Interval-aware price changes now apply to search results too, not just favorites/popular
- Forward AbortSignal to QuickChart POST for proper cancellation on unmount
- Simplify Yahoo client retry logic (try/catch instead of for-loop with unreachable throw)
- Make favorites persistence async with error toast on failure
- Add comprehensive test suite (211 tests across 11 files): client auth/retry, search/quote, QuickChart POST, intervals, favorites logic, interval change computation

## [Initial Version] - {PR_MERGE_DATE}

- Search stocks by name or symbol via Yahoo Finance
- Favorites section with reordering, plus a Popular stocks section below
- Price evolution charts with volume bars across 9 intervals (1D, 1W, 1M, 3M, 6M, YTD, 1Y, 2Y, 5Y)
- Interval-aware change badges — badges reflect the selected time period, not just daily
- Company logos fetched automatically for list items
- Next earnings date displayed with option to add to macOS Calendar (⌘⇧E)
- Latest news headlines linked in the detail panel
- Currency codes shown on all prices (disambiguates USD, CAD, AUD, etc.)
- Market state awareness (pre-market, regular, post-market, closed)
- Rich detail metadata: open, market cap, P/E, 52-week range, exchange tags
