# Changelog

## [1.3.0] - 2025-12-25

### Added

- **My Blueprints** - New command to track your blueprint collection
  - View all blueprints with icons and rarity
  - Mark blueprints as obtained/needed
  - Track duplicate blueprints
  - Filter by: All, Needed, or Obtained
  - Progress counter in title (e.g., "Blueprints (12/76)")
- Blueprint tracking in Search Items - quickly mark blueprints as obtained (Cmd+O)

### Fixed

- Fixed My Blueprints search failing when searching for items not yet loaded (same fix as Search Items in 1.2.0)

## [1.2.0] - 2025-12-25

### Changed

- Search Items now uses server-side search for instant results across all 500+ items
- No longer need to scroll through pages before searching - search works immediately
- Added item type filter dropdown with all 15 item categories

## [1.1.1] - 2025-12-25

### Fixed

- Fixed Event Timers displaying incorrect times by properly interpreting API times as UTC

## [1.1.0] - 2025-12-16

### Changed

- Event Timers now auto-refresh every 60 seconds to update event statuses
- Events properly transition from "upcoming" to "active" without manual refresh

### Fixed

- Fixed Event Timers showing no results due to API response format mismatch
- Added proper parsing of recurring daily time slots into actual timestamped events

## [1.0.0] - 2025-12-04

### Added

- **Search Items** - Browse 500+ Arc Raiders items with pagination and type filtering
- **Search ARCs** - View ARC enemy types and descriptions
- **Search Quests** - Browse quests with objectives and rewards
- **Event Timers** - View active/upcoming events by map
- **Browse Traders** - Browse trader inventories with prices
- **Open Map** - Quick access to MetaForge interactive maps
