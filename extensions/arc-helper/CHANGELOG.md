# Changelog

## [1.7.0] - {PR_MERGE_DATE}

Frozen Trail update support and MetaForge API sync.

### Added

- **Pendola Pass** - New Frozen Trail map in Open Map
- **Crafting & Sources** - Item details now show the crafting recipe, what it recycles into, what recycles into it, what it is used to craft, compatible mods, which ARCs drop it and which traders sell it (and for how much)
- **Item Overviews** - Item details include MetaForge's full write-up, plus cosmetic variants for outfits and other cosmetics
- **Rarity Filter** - Filter Search Items by rarity, including the new Amplified rarity
- **New Item Types** - Outfits, Furniture, Design, Cosmetic, Augment, Research, Stencil, Ammunition, Shield and more in the Search Items filter
- **ARC Loot** - ARC details list their loot drops (searchable from the ARC list), and flying ARCs are marked
- **Ermal's Barter Offers** - Traders shows Ermal's time-limited offers (with time remaining) and permanent services, including accepted items
- **Quest Trader Filter** - Quests are grouped by trader with a trader filter, show quest images, and list required and provided items with icons
- **View Related Items** - Jump from quests, ARC loot, offers and recipes straight to an item's details (Cmd/Ctrl+I)
- **Open Map from Events** - Event Timers can open the event's map; event details show the schedule region

### Fixed

- Quest required items showed `[object Object]` after a MetaForge API change
- Items without a value or rarity (outfits, furniture, some blueprints) showed "null"
- Item type filters that no longer exist (Advanced Material, Consumable, Gadget, Throwable) always returned no results
- Quest search only searched quests that had already been loaded
- Blueprint progress and Needed/Obtained filters only counted the first page of blueprints
- Quest and item guide links now use MetaForge's current guide URLs
- Quests referencing items MetaForge hasn't added yet no longer break the quest list
- Blue Gate and Stella Montis map icons
- Event countdowns showing "Active now!" in the final minute before an event starts

### Changed

- Removed the custom 60-minute cache layer; data is still cached between launches by Raycast and refreshed in the background
- Failed requests now show a toast with a Retry action
- Blueprint tracking saves are serialized so rapid toggles can't overwrite each other
- Updated `@raycast/api` and `@raycast/utils`

## [1.6.0] - 2026-05-10

### Added

- **Riven Tides Map** - Added the new Riven Tides map to Open Map (already referenced in events-schedule data)
- **Quest Guide Links** - Quests with associated MetaForge guides now expose an "Open Quest Guide" action in the action panel
- **Item Guide Links** - Items with associated MetaForge guides now expose an "Open Item Guide" action
- **Quest Trader** - Quest list shows the issuing trader as an accessory; the detail view embeds the quest image and shows the trader name in metadata
- **Item Shield Type** - Detail metadata now shows `Shield Type` for armor items where applicable

### Changed

- Extended `Item`, `Quest`, and `Arc` interfaces in `src/api.ts` to model fields the MetaForge API now returns (`guide_links`, `shield_type`, `image`, `trader_name`, `position`, `created_at`, `updated_at`, etc.)

## [1.5.1] - 2026-02-16

### Fixed

- Updated Open in Browser URLs to match MetaForge's new URL structure

## [1.5.0] - 2026-01-28

### Fixed

- **MetaForge API Updates** - Updated to latest API changes
  - Event Timers now uses `/events-schedule` endpoint (replaces deprecated `/event-timers`)
  - Simplified event processing - server now pre-computes timestamps
  - Quest locations now properly display map names

## [1.4.0] - 2026-01-04

### Added

- **Windows Support** - Extension now works on both macOS and Windows
  - All keyboard shortcuts work cross-platform (Cmd on macOS, Ctrl on Windows)
- **Shared API Cache** - Data is cached for 60 minutes across all commands
  - Reduces API calls to MetaForge (helps avoid rate limits)
  - Faster load times when switching between commands

### Fixed

- Added graceful error handling for API failures - shows friendly toast instead of crashing

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
