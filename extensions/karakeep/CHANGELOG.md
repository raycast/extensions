# Karakeep Changelog

## [2.1.0] 2025-11-21

### Big changes

- **Separated Create Bookmark and Create Note commands**: Split bookmark creation into two dedicated commands for better UX
  - `Create Bookmark` now focuses exclusively on URL bookmarks
  - New `Create Note` command for text-only notes
- **Browser Extension Integration**: Automatically prefill URL field from active browser tab
  - Uses Raycast Browser Extension API to fetch current tab URL
  - New preference to toggle automatic URL prefilling (enabled by default)
  - Gracefully handles cases where browser extension is unavailable
- **Raycast API Optimization**: Migrated to native Raycast pagination
  - Replaced manual pagination state management with Raycast's native `useCachedPromise` pagination
  - Eliminated rendering loop bug caused by stale closures
  - Optimized memory usage by removing data accumulation across pages
  - Bookmarks display in reverse chronological order (newest first)
  - **Code reduction**: 65% fewer lines across pagination hooks (384 → 136 lines)

### Chores

- Updated dependencies
- Updated ESLint configuration
- Refactored pagination hooks to use Raycast utilities

## [2.0.1] - 2025-06-28

### Major Changes

- Renamed to Karakeep
- Add create bookmark default type setting

## [2.0.0] - 2024-12-11

### Major Changes

- Merged and replaced with enhanced version from @foru17, bringing comprehensive features and improvements
- Added full CRUD operations for bookmark management
- Implemented tag management system
- Added AI-powered features
- Enhanced UI following Raycast's design principles
- Improved documentation and user guide

## [Pre-release Development]

### [Karakeep API Integration] - 2024-11-24

- Implemented core functionality for communicating with Karakeep API
- Added search, list, and detail view functionality
- Fix lists count display bug

### [UI Development] - 2024-11-24

- Designed and implemented main list view for bookmarks
- Created detail view for individual bookmarks

### [Settings and Preferences] - 2024-11-24

- Implemented configuration for Karakeep API host and apikey
- Added language preference setting (English and Chinese)

### [Enhanced Project Initialization] - 2024-11-24

- Set up basic project structure
- Configured development environment with TypeScript and Raycast API
- Created initial README and documentation

### [Add url as item title if title is not defined] - 2024-09-10

### [Initial Version] - 2024-08-22
