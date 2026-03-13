# Espanso Changelog

## [Major Improvements] - 2026-02-02

### New Features

- **Profiles Support**: Organize matches by context using the `profiles/` folder structure
  - Automatically detects matches in `profiles/work/`, `profiles/home/`, etc.
  - New profile dropdown to filter matches by context
  - Smart categorization that separates profiles from categories
  - Matches outside profiles remain accessible from all contexts

- **Customizable Breadcrumb Separator**: New extension setting to customize the character used for breadcrumb separation
  - Default: `·` (middle dot)
  - Choose from: `/`, `>`, `→`, `›`, `»`, or any custom character
  - Applied consistently across categories, subcategories, and profiles

### Improvements

- **Enhanced Category Display**: Full folder hierarchy shown with breadcrumb navigation
- **Proper Acronym Formatting**: 50+ common tech acronyms (AI, API, UI, UX, HTML, CSS, JSON, etc.) now display correctly
- **Smart Index Handling**: When filename is "index", subcategory is hidden to avoid redundancy
- **Better Organization**: Separated folder and filename handling in category logic
- **TypeScript Type Checking**: Added `typecheck` script to package.json for improved code quality
- **Dependency Updates**: Upgraded to latest versions for better performance and security

### Technical Changes

- Refactored category derivation logic for better maintainability
- Added centralized `formatCategoryName` utility for consistent formatting
- Improved breadcrumb path generation with full hierarchy support
- Enhanced type safety across components

## [Improvements] - 2025-07-15

- Support for `imports` in Espanso YAML files: you can now import matches from other files, and imported matches will appear in search with the correct category (based on the imported file name or path).

## [Improvements] - 2025-07-14

- Add a custom Espanso binary path in preferences to make it work even with non-standard installations.

## [Patch] - 2024-07-09

- Remove form items from the list.
- Create a MatchItem component for readability.

## [Patch] - 2024-06-15

- Fixing search when the user has installed packages.

## [Improvements] - 2024-06-08

- Add metadata display.
- Add categories and subcategories depending on folders and files.

## [Improvements] - 2024-02-06

- Improved user experience with enhanced syntax and better error handling.
- Simplified code structure for better maintainability.
- Enhanced application robustness and performance.
- Introduced more user control by adding enable and disable functionality.
- Streamlined application functions for efficiency.
- Removed a forgotten console.log.

## [Search Matches Improvements] - 2023-11-04

- Updated command - Search Matches: search results now display match labels and triggers.
- Bug fix: A match with a label's replacement text is now displayed correctly.

## [Update] - 2023-08-29

- New command - Add Match: add a new match to any of your Espanso config files.
- New command - Toggle Espanso: disable or enable Espanso.

## [Initial Version] - 2023-05-09

First version.
