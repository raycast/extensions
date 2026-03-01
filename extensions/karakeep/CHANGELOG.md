# Karakeep Changelog

## [2.1.1] - 2026-02-23

### Fixes

- **Fixed pagination sometimes stuck at 10 items after reopening the Bookmarks list**: Added a small prefetch strategy to avoid Raycast pagination deadlocks when the first page is cached and the list isn’t scrollable yet.
- **Fixed authenticated preview images not rendering in list view**: Restored the `getScreenshot` “prewarm” flow and limited it to the currently selected item to prevent performance issues.
- **Fixed BookmarkDetail always showing placeholder image for bookmarks without screenshots**: Detail view now only renders the screenshot image when an actual screenshot has been loaded, preventing the placeholder from being shown permanently.
- **Fixed stale action handlers in BookmarkItem**: Actions (favorite, archive, delete) now always operate on the latest bookmark state instead of the initial snapshot passed by the parent.
- **Fixed server-side search not re-fetching when search text changes**: The online search hook now correctly re-executes when the user updates the search query.
- **Fixed React Rules of Hooks violation in Lists view**: `getDashboardListsPage` was calling `useConfig()` inside a regular function; converted to a pure helper that receives `apiUrl` as a parameter.

### Improvements

- **More consistent toasts and translations**: Unified toast handling for common actions and improved i18n placeholder formatting; added missing translation keys used by the UI and Quick Bookmark.
- **Internal cleanup**: Strengthened API typings, removed remaining `console.*` usage in favor of structured logging, and simplified selection/state handling after list mutations (e.g., delete).
- **Type safety improvements**: `List` type now includes `parentId` and `icon` fields used by the hierarchy view; `Asset.assetType` is now an optional property instead of a `| undefined` union member.
- **Simplified `useTranslation` hook**: Removed unnecessary `isInitialMount` ref pattern; language sync is now handled by a single clean effect.
- **Removed redundant imports and calls**: Cleaned up duplicate `Bookmark` import in `quickBookmark.tsx`, unnecessary `URL` polyfill import in `apis/index.ts`, and a redundant `showHUD` call that duplicated the success toast in `createNote.tsx`.
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

### Changes

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
