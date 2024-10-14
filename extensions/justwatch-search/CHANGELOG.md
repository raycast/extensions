# JustWatch Search Changelog

## [Open in IMDB + Add Link Icons] - {PR_MERGE_DATE}

## [Improvements] - 2024-09-22

- Upgrade dependencies
- Refactored most of the code for better readability and maintainability
- Moved API to use `useFetch` hook, so it properly kills the request when search changes
- Moved Country Code selection to use `useCachedState` hook, so it will properly update search when changed

## [Fix API] - 2023-06-16

- Migrate JustWatch API from REST to GraphQL since REST no longer works

## [New Additions] - 2023-06-16

- Add "Rent" and "Buy" to listing for easy distinction
- Add IMDB ratings and score
- Add Resolution information (SD, HD, 4K) to listings
- Update "Free" to include providers that are free with ads
- Update country list to include all countries supported by JustWatch

## [Added JustWatch Search] - 2022-03-22

- Initial extension code
