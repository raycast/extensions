# Implementation Plan (ImplementationPlan)

## Phased Development Roadmap

### Phase 1: Package Manifest & Environment Setup
- [x] Analyze requirements, existing assets, and macOS Photoshop integration points.
- [ ] Update `package.json`:
  - Define commands: `recent`, `search-projects`, `clear-cache`, `new-window`.
  - Add user preferences (`defaultViewMode`, `gridColumns`, `searchScope`).
  - Fix lint issues (remove empty subtitle fields, ensure valid metadata).
- [ ] Ensure 512x512 square icon in `assets/extension-icon.png`.
- [ ] Configure `tsconfig.json` and ESLint settings.

### Phase 2: Core Engine & Services
- [ ] **Thumbnail Engine (`src/services/thumbnails.ts`)**:
  - Implement cache directory management under `environment.supportPath`.
  - Asynchronous generation using `qlmanage -t -s 512`.
  - Content hashing cache keys `(path + mtime)`.
  - Safe error handling and graceful fallbacks.
- [ ] **Recents Engine (`src/services/recents.ts`)**:
  - Parse `com.adobe.mediabrowser.plist` and `MachinePrefs.psp`.
  - ExtendScript query if Photoshop is running.
  - Spotlight `kMDItemLastUsedDate` ranking.
  - Filter by valid Photoshop extensions and verify file existence.
- [ ] **Spotlight Search Engine (`src/services/search.ts`)**:
  - Fast `mdfind` query builder for Photoshop content types.
  - Metadata enrichment via `mdls` (dimensions, resolution, layer names, color space).
  - Scope configuration (`~` or `/`).
- [ ] **Automation Engine (`src/services/automation.ts`)**:
  - Cache purge logic (ExtendScript `app.purge` + disk cache cleanup in `~/Library/Caches/com.adobe.Photoshop`).
  - New window/document creation via AppleScript.

### Phase 3: UI Presentation Layer
- [ ] **Shared Action Panel (`src/components/PhotoshopActionPanel.tsx`)**:
  - Primary: Open in Photoshop (`↵`).
  - Quick Look (`⌘Y`) targeting the rendered PNG artwork.
  - Toggle View Mode (`⌘V`).
  - Reveal in Finder (`⌘↵`).
  - Clear Cache (`⌥⌘K`).
  - New Document (`⌥⌘N`).
  - Copy Path / Copy File.
- [ ] **Project Grid Item (`src/components/ProjectGridItem.tsx`)**:
  - Render high-resolution PNG thumbnail card.
  - File title, directory, dimensions, and relative time.
  - Quick Look integration.
- [ ] **Project List Item (`src/components/ProjectListItem.tsx`)**:
  - Icon, title, folder subtitle, accessory badges (size, time).
  - Side panel detail view (`List.Item.Detail`) with rendered preview, technical dimensions, layers list, and file stats.

### Phase 4: Command Entrypoints
- [ ] `src/recent.tsx`: Recent Projects command with Grid/List toggle and dynamic loading.
- [ ] `src/search-projects.tsx`: System-wide search command with real-time query filtering.
- [ ] `src/clear-cache.ts`: No-view command for purging Photoshop caches with Toast feedback.
- [ ] `src/new-window.ts`: No-view command for creating a new document in Photoshop.

### Phase 5: Quality Assurance & Verification
- [ ] Run `ray lint` and ensure 0 errors.
- [ ] Run `npm run build` and ensure clean TypeScript compilation.
- [ ] Manual verification of thumbnail extraction and Quick Look previews.
- [ ] Test on real PSD files on the local system.

### Phase 6: Git & Release Preparation
- [ ] Write rich `README.md` with screenshots, feature breakdown, and installation instructions.
- [ ] Initialize Git repository (if needed) and create conventional commit adhering to Sentry standards.
