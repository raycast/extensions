# duan Changelog

## [Show Last Visited in Actions] - 2025-09-29

### Added
- New "Last Visited" action in the Actions panel for each link
  - Displays the last visited time and shows a toast on activation
  - Keyboard shortcut: ⌘T

### Changed
- Parse `last_visited_at` as UTC from `YYYY-MM-DD HH:MM:SS` (no T/Z/offset) by converting to ISO (`...T...Z`) and render in local time

## [Added Sorting, Filtering & Pin Features] - 2025-09-17

### Added
- Pin important links to keep them at the top
  - Pinned links stay in a separate section
  - Reorder pinned links with ⌘⇧↑/↓
  - Pinned links are excluded from filtering and sorting
- Flexible sorting options
  - Sort by creation time (newest/oldest first) - ⌘⇧C
  - Sort by last visited time - ⌘⇧L
  - Sort by visit count - ⌘⇧N
  - Sorting preferences are automatically saved
- Quick filtering dropdown (⌘P)
  - Show all links
  - Show only active links
  - Show only disabled links
  - Filter selection persists across sessions

### Enhanced
- Improved data processing pipeline
- Better visual organization with sections
- Automatic cleanup of deleted pinned links

### Fixed
- Edit link now uses Raycast's default shortcut (⌘E)

## [Initial Version] - 2025-06-26
