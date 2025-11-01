# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Changed
- Replaced `useCachedPromise` with manual `useEffect` and `useState` for better refresh control
- Implemented internal `setInterval` to enable smooth 1-second updates when menu dropdown is open
- Optimized loading state to only show on initial load, preventing UI flicker
- As per greptile's feedback updated Node.js version in `mise.toml` to use specific version `20.11.0` instead of `latest` for better dependency management
- Removed unused `revalidate` variable from `useCachedPromise` hook to fix ESLint error

### Added
- Initial release of Ping Menu extension
- Real-time ping monitoring to google.com in menu bar
- Display current latency in milliseconds with colored dot indicator
- Green dot for latency < 60ms, orange for < 150ms, red for higher latency
- Dropdown menu showing last 10 ping results with timestamps
- Tooltip on hover showing current latency and last update time
- Background refresh every 10 seconds when menu is closed
- Live 1-second updates when menu is open
- LocalStorage caching for instant display on startup
