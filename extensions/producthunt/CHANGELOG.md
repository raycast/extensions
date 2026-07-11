# Product Hunt Changelog

## [3.0] - 2026-06-02

- Remove the legacy HTML scraper and the `cheerio` dependency; all data now comes from the official Product Hunt API or the public Atom feed
- Unify logging on a single logger with automatic credential redaction
- Fall back to the basic feed (instead of a blocking error) when credentials are invalid
- Add a "Reload Extension" action so updated API credentials take effect without quitting
- Improved changelog heading formatting
- Updated dependencies

## [2.4] - 2026-06-01

- Fix 403 errors by migrating data fetching to the official Product Hunt GraphQL API v2 (#28424)
- Add optional "API Key" and "API Secret" preferences (your Product Hunt OAuth app credentials from producthunt.com/v2/oauth/applications); the extension exchanges them for a public, read-only client-credentials token
- Without credentials, the extension falls back to Product Hunt's public Atom feed (limited: no votes, comments, makers, or thumbnails); feed mode hides empty stats, opens launches in the browser, and offers an action to add credentials
- Product detail view now uses the official API instead of scraping product pages
- Compute "today" on Product Hunt's Pacific launch day so the list matches the site (UTC could return an empty set near the day boundary)
- Show a toast with an "Open Extension Preferences" action when API credentials are rejected
- Add a Refresh action (⌘R) that bypasses the response cache
- Square-crop list icons and trim taglines for cleaner rendering
- Add short-lived response caching to stay within the API rate budget
- No production code fetches Product Hunt HTML anymore, avoiding Cloudflare bot blocks

## [2.3] - 2025-12-07

- Fix scraper to use `latestScore`/`launchDayScore` fields for vote counts (Product Hunt API changed from `votesCount`)
- Use browser-like headers for all fetch requests to avoid Cloudflare blocking
- Implement custom structured logger with emoji-prefixed output
- Update dependencies
- Removed .eslintrc.json in favor of eslint.config.mjs

## [2.2] - 2025-09-12

### Added

- Raycast-only structured logger with optional toasts (controlled by new "Verbose Logging" preference)
- Lightweight session-start instrumentation on the frontpage command

### Changed

- Scraper now prefers Apollo push(rehydrate) parsing, with DOM fallbacks and last-resort RSS fallback
- Added short-lived LocalStorage cache to reduce repeated network fetches
- Improved error handling and logging in image utilities and imgix helpers
- Non-error logs routed to console.log/console.warn to avoid Raycast error overlay

## [2.1] - 2025-04-09

### Added

- Added scraper tests to help with stale or incorrect counts

### Changed

- Improved handling of vote count scraping
- Swapped vote count and comments in List Item to match Product Hunt leaderboard

## [2.0] - 2025-04-07

### Added

- Enhanced image gallery with improved navigation
- "View Previous Launch(es)" action for products with multiple launches
- Dedicated gallery view with grid layout for product images
- Improved navigation with "Back to Featured Products" functionality

### Changed

- Refactored frontpage implementation to eliminate code duplication
- Consolidated product actions into a reusable component
- Created reusable TopicsAction component for consistent UI
- Improved image processing with better SVG handling
- Enhanced error handling and user feedback

## [1.1] - 2025-02-21

### Changed

- Updated icons for light and dark themes
- Fixed typos
- Updated package.json

## [1.2] - 2025-02-21

### Added

- ✨ AI Enhancements: Added AI tool

## [1.1] - 2024-07-24

### Added

- Added app description

## [1.0] - 2023-09-01

### Added

- Added result caching
- Added new icons
