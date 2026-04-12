# WP Bones Changelog

## [New Features & Improvements] - 2026-04-12

### New Commands
- **Ask WP Bones AI** — Ask questions about WP Bones and get AI-powered answers based on the documentation (requires Raycast Pro)
- **WP Bones Release Notes** — View the latest release notes inline without opening the browser

### New Features
- **Boilerplate Preview** (⌘P) — Preview the README of any boilerplate template before creating a repository
- **Copy URL** action in search results

### Bug Fixes
- Fixed version comparison that broke for multi-digit version segments (e.g. `1.10.0` vs `1.7.0`)
- Fixed menu bar `useEffect` priority chain — error state no longer gets overwritten by other states
- Replaced `useStreamJSON` with `useFetch` in search documentation for more reliable results
- Added empty view with feedback when search query is too short (< 3 characters)
- Removed dead code: unused `templates.ts` and `use-wp-bones-template.tsx`

## [Fixes] - 2025-06-25

- 🔥 Removed the complete demo link for improved clarity and maintenance
- ✨ Fixes the remote search functionality to ensure it works correctly with the latest API changes
- 🌟 Improves the search results 
- 📝 Updated the README.md to reflect the latest changes and improvements

## [Fixes] - 2025-01-17

- 🩹 Addressed minor URL-related issues
- 🐛 fixes the discord URL

## [News features and improvements] - 2024-11-23

- ✨ Added `useVersion()` hooks with comprehensive error handling mechanisms
- ✨ Added `useBoilerplates()`API fetch to retrieve boilerplate list with comprehensive error handling and fallback mechanism
- ✨ Added "See in Action" Command both in the Menu Bar and the Actions
- 🍱 Updated the Menu Bar screenshot and Actions
- ⚡️ Optimized and compressed images for improved performance and reduced file size
- ✨ Renamed `use` command to `create` for improved clarity and semantic precision
- 🔥 Removed unused original icons to streamline visual assets and reduce unnecessary resource overhead
- 🔥 Removed unused icon assets to reduce application bundle size and improve resource management

## [Enhancements] - 2024-10-31

- ⚡️ Resolved an issue that could cause the application to not properly refresh when a new version is reported

## [Enhancements] - 2024-10-31

- 📝 Updated `package.json` removes owner

## [Enhancements] - 2024-10-31

- 📝 Updated README.md
- 🩹 Addressed minor URL-related issues

## [Initial Version] - 2024-10-31