# Hugeicons UI Changelog

## [1.1.0] - 2026-04-27

### Added

- API-backed Hugeicons search, preview, and style inspection flow
- Free bundled Hugeicons catalog for users without a key
- Bookmark folders with create, edit, delete, and bulk add actions
- Raycast AI tools for search, icon details, and code export
- Settings command for color, grid size, and primary action defaults
- Recent searches, preview-style persistence, and richer empty states

### Changed

- Switched to preference-based key behavior: free local icons by default, full Pro search when a key is present
- Added SVG caching and search result caching to speed up repeat usage
- Improved export and copy actions, including PNG clipboard and download behavior on macOS
- Grouped "View All Styles" by Standard, Rounded, and Sharp families with duplicate visual variants merged
- Updated README and manifest metadata to reflect the expanded feature set

## [1.0.1] - 2026-03-08

### Changed

- Updated `@hugeicons/core-free-icons` to the latest version
- Updated `@hugeicons/react` to the latest version
- Regenerated bundled Hugeicons metadata

## [1.0.0] - 2026-01-20

### Added

- **Browse Hugeicons** - Browse and search through thousands of free Hugeicons icons directly from Raycast
- **Copy SVG Code** - Copy raw SVG code for any icon with a single click
- **Copy React Component** - Copy React component import code for seamless integration
- **Copy React Usage** - Copy ready-to-use React component usage examples
- **Copy Icon Name** - Copy icon names for programmatic reference

### Features

- Fast icon search with real-time filtering
- Grid view with 8-column layout for easy browsing
- Batch loading (100 icons at a time) for optimal performance
- Configurable default copy action (SVG, React Component, React Usage, or Icon Name)
- Keyboard shortcuts for quick access to all copy actions
- Support for free Hugeicons icons
