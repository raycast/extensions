# OpenRouter Models Finder Changelog

## [Update Default Actions] - 2026-04-20

- Make Enter paste the selected model ID into the active app
- Move Copy Model ID to Command + Return
- Add Command + Shift + Return for Copy Model Name

## [Add Fuzzy Search] - 2026-01-13

- Multi-term search with space-separated terms (all must match)
- `useMemo` optimization for filtered results performance
- Updated dependencies (@raycast/*, eslint, prettier, typescript)

## [Update README] - 2025-08-22

- Removed redundant parts related to the development environment from the readme document, making the plugin description more concise and readable.

## [Initial Release] - 2025-08-20

- Search AI models from OpenRouter with real-time filtering
- Copy model IDs to clipboard with one click
- Copy model names for easy reference
- Display context window sizes with smart unit formatting (B/M/K tokens)
- Sort models by release date (newest first)
- View model details directly on OpenRouter website
