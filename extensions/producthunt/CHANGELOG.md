# Product Hunt Changelog

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
