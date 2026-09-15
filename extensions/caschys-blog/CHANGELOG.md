# Caschys Blog Changelog

## [Archive Search and Reliability] - {PR_MERGE_DATE}

- Fixed multi-page loading when WordPress caps RSS responses below the requested page size.
- Search now queries the public WordPress feed instead of only the recent local cache.
- Added a dedicated archive-search command and category filtering for recent articles.
- Cleaned RSS HTML before rendering article details or returning excerpts to Raycast AI.
- Validated cached article data and hardened HTML entity decoding.
- Tightened AI instructions so answers stay within returned feed data and expose missing context.
- Kept stale cached articles available when the network refresh fails.
- Fixed double-encoded subjects and bodies in tip email drafts.
- Added live feed checks and regression tests.
- Updated Raycast, React, TypeScript, ESLint, and test dependencies.

## [Version 1.0] - 2025-04-05

### Added

- AI-powered assistant for natural language interaction
- Multilingual support - ask questions in any language
- Welcome message with sample queries when first using the AI assistant
- New preferences for customizing the number of posts to load:
  - Posts Per Page: Control how many posts are loaded per page
  - Maximum Posts: Set the maximum total number of posts to load
- Open Website command for quick access to the blog

### Fixed

- Updated Toast API usage to follow latest Raycast guidelines
- Updated dependencies to latest versions
- Improved error handling with proper toast notifications
- Added safe date parsing to prevent errors with invalid date formats
