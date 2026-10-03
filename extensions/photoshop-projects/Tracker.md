# Progress Tracker (Tracker)

## Milestone Log

### Phase 1: Planning and Discovery
- [x] Initialized project requirements and reviewed user specifications. (2026-10-03)
- [x] Researched macOS Photoshop integration points (`app.recentFiles`, `com.adobe.mediabrowser.plist`, `MachinePrefs.psp`, Spotlight `mdls`). (2026-10-03)
- [x] Tested native thumbnail extraction with `qlmanage` and confirmed fast PNG generation from PSDs. (2026-10-03)
- [x] Created living planning documents (`PRD.md`, `TechSpec.md`, `AppFlow.md`, `Schema.md`, `ImplementationPlan.md`, `Rules.md`, `Tracker.md`, `Design.md`). (2026-10-03)

### Phase 2: Manifest & Core Engine Implementation
- [x] Configured `package.json` with 3 commands: `recent`, `search-projects`, `clear-cache`. (2026-10-03)
- [x] Formatted and verified 512x512 extension icon. (2026-10-03)
- [x] Implemented `ThumbnailService` with disk caching and fast QuickLook extraction. (2026-10-03)
- [x] Implemented `PhotoshopRecentsEngine` with MRU plist/psp parsing and AppleScript fallback. (2026-10-03)
- [x] Implemented `SpotlightSearchEngine` with `mdfind` and `mdls` attribute parser. (2026-10-03)
- [x] Implemented `PhotoshopAutomationEngine` for cache purge. (2026-10-03)

### Phase 3: UI Layer
- [x] Created `PhotoshopActionPanel` with shortcuts (`↵`, `⌘Y`, `⌘V`, `⌘↵`, `⌥⌘K`, `⌘R`, `⌥⌘C`, `⌘C`). (2026-10-03)
- [x] Created `ProjectGridItem` for visual thumbnail card layout. (2026-10-03)
- [x] Created `ProjectListItem` with side-panel detail inspector. (2026-10-03)
- [x] Implemented view mode toggle with `LocalStorage` persistence. (2026-10-03)

### Phase 4: Command Views
- [x] Implemented `src/recent.tsx`. (2026-10-03)
- [x] Implemented `src/search-projects.tsx`. (2026-10-03)
- [x] Implemented `src/clear-cache.ts`. (2026-10-03)

### Phase 5: Verification & Release
- [x] Ran `ray lint` and confirmed 0 errors and 0 warnings. (2026-10-03)
- [x] Ran `npm run build` and confirmed 0 TypeScript compilation errors. (2026-10-03)
- [x] Verified native QuickLook rendered PNG extraction and Quick Look previews. (2026-10-03)
- [x] Authored complete documentation in `README.md`. (2026-10-03)
- [x] Create clean git commit following Sentry conventions. (2026-10-03)

### Phase 6: Attribute Editing, Sorting & UI Enhancements
- [x] Fixed detail preview image rendering with `file://` protocol and URI encoding to handle spaces in filesystem paths. (2026-10-03)
- [x] Configured native macOS PSD file icon for List View items while displaying artwork in the detail pane and Grid cards. (2026-10-03)
- [x] Implemented EditDateForm to backdate and frontdate files with SetFile and utimes. (2026-10-03)
- [x] Implemented RenameForm to rename Photoshop documents safely. (2026-10-03)
- [x] Added Finder actions: Open in New Finder Window and Open in New Finder Tab. (2026-10-03)
- [x] Implemented multi-criteria sorting (Name A-Z, Name Z-A, Recent, Date Modified Newest/Oldest, Size) with LocalStorage persistence. (2026-10-03)
- [x] Added searchBarAccessory dropdown on the top right for switching Grid/List view and selecting sort order. (2026-10-03)
- [x] Removed all comments across the entire codebase. (2026-10-03)
- [x] Removed New Photoshop Document command and action across codebase and manifest. (2026-10-03)
