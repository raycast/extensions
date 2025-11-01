# Changelog

## [1.0.0] - {PR_MERGE_DATE}

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
