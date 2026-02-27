# Security Digest Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-02-28

### Added

- **Initial Store Submission**: Prepared and submitted the extension to the Raycast Store.
- **Chunked Parallel Fetching**: Implemented a bounded parallel fetching strategy (5 feeds at a time) for significantly faster data loading.
- **Store Metadata**: Added `metadata` folder with screenshots and organized assets for store compliance.
- **Simplified Categorization**: Reduced categories to a streamlined 3-set: **Vulnerabilities**, **Intelligence**, and **News**.
- **English Localization**: Fully translated the UI and all categories into English.
- **Raycast AI Integration**: Added a "Summarize with AI" action to news items, providing concise security insights through built-in LLMs.
- **Publication Guard**: Added a project-local `.npmrc` to lock the registry to official npm.

### Fixed

- **Memory Stability**: Resolved "JS heap out of memory" issues by replacing `rss-parser` with a custom lightweight `fast-xml-parser` implementation.
- **OOM Optimizations**: Implemented aggressive string pruning and immediate item filtering to stay within Raycast's 512MB limit.
- **Build System**: Fixed React type conflicts between version 18 and 19.
- **Race Conditions**: Added `useRef` fetch guards to prevent concurrent fetch executions during re-renders.
- **URL Sanitization**: Removed broken RSS feeds and sanitized mirror URLs in `package-lock.json`.

### Changed

- **Modernized UI**: Updated the `DailyDigest` view with a cleaner category filter and improved layout.
- **Refreshed Documentation**: Updated `README.md` with a new logo, features list, and side-by-side screenshots.
