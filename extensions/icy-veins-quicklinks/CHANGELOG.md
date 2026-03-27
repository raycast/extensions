# Icy Veins Quicklinks Changelog

## [Copy Link Action on Page Items] - {PR_MERGE_DATE}

### Added
- **Copy Link** action (⌘C) on all guide page items — copies the guide URL to clipboard and shows a success toast notification with the guide title

## [Custom Macros, Favorites, Recent Searches, Stat Priority, Role Icons] - 2026-03-25

### Added
- **Custom Macros** — define up to 5 personal text macros in extension preferences to expand shorthand queries (e.g. `main` → `sp pve gear`). Access via "Manage Custom Macros" in any Action Panel.
- **Favorites** — star up to 5 specs with ⌘F. Favorited specs appear in a dedicated section at the top of the home grid.
- **Recent Searches** — the last guide page you opened is shown at the very top of the home grid for quick re-access.
- **Stat Priority Copier** — open the Action Panel on any spec to copy its current stat priority to the clipboard (e.g. `Mastery > Critical Strike > Haste > Versatility`). Results are cached for 1 hour.
- **Role Icons** — each spec card now displays a composited role badge (DPS / Tank / Healer) in the bottom-right corner of the icon.
- **Spec Usage Sorting** — specs you select most often bubble to the top of the spec grid automatically.

### Changed
- Home grid now shows sections in order: Recent → Favorites → Classes
- Spec cards use composited role-icon images (built at compile time via `npm run generate-icons`)
- Grid uses `Fit.Fill` with zero inset for full-bleed icons

### Fixed
- Stat priority parser no longer includes changelog date entries from the Icy Veins page
- Hunter spec filter no longer incorrectly matched Demon Hunter specs

## [Grid Navigation & Refactoring] - 2026-03-25

### Added
- Staged grid navigation: home → class → spec → mode → page
- Per-class spec grids with correct spec counts
- Shared `specMatcher.ts` and `text.ts` utilities
- `getPagesForMode()` helper and `displayTitle` on all page entries

### Changed
- Refactored `resolveGridState` into a named resolver pipeline
- Extracted `GridState` and `SpecGridItem` types into `types.ts`
- Local assets for all mode and page icons

## [Initial Release] - 2026-03-20

### Added
- Query-driven navigation to Icy Veins WoW guides for all 40 specs
- Supports `[spec] [mode] [page]` query format in any order
- Short aliases for all specs (e.g. `sp`, `bdk`, `ww`, `ret`)
- PvE and PvP guide pages per spec
- Inline argument support for fastest invocation (`iv sp pve gear`)
- Tank specs suppressed from PvP suggestions
- Healer URL segment override (`healing` vs `healer`)
