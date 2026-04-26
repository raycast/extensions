# Yr Weather Forecast Changelog

## [Reliability, dark mode, and quality overhaul] - {PR_MERGE_DATE}

- Add 12/24-hour clock format preference (defaults to 24h)
- Add error boundaries for graceful crash recovery
- Add runtime validation of all external API responses
- Fix dark mode graph colors with centralized theme palettes
- Fix timezone and date correctness in forecast filtering
- Fix sunrise/sunset graph rendering on initial load
- Harden location identity so favorites survive name variations
- Improve search reliability: abort stale requests, fix debounce edge cases
- Improve search result naming with location type emojis
- Fix favorites failing to refresh and retry on errors
- Filter invalid coordinates from location search results
- Show sunrise/sunset indicators in all graph views
- Add resolution feedback and update timestamps to data summary
- Major internal refactoring and 120+ unit/integration tests

## Initial release [1.0.0] - 2025-09-10

- Initial release with weather forecasts from MET
- Location search via OpenStreetMap Nominatim
- Favorites system with reordering
- 48-hour detailed and 9-day summary forecast views
- Graph visualizations with temperature, precipitation, and wind data
- Date-aware search queries (English and Norwegian)
- Preferences for units, wind direction, sunrise/sunset display, and debug mode
