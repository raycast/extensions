# Technical Specification (TechSpec)

## Architecture Overview
The **Photoshop Projects** Raycast extension is built using TypeScript, React 19, and the Raycast API (`@raycast/api` and `@raycast/utils`), targeted specifically for macOS.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Raycast UI Layer                                │
│   ┌───────────────────────────────┐  ┌───────────────────────────────┐ │
│   │   Recent Projects Command     │  │   Search Projects Command     │ │
│   │    (Grid View / List View)    │  │    (Grid View / List View)    │ │
│   └───────────────┬───────────────┘  └───────────────┬───────────────┘ │
│                   │                                  │                 │
│                   ▼                                  ▼                 │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                    Shared Action Panel Component                 │ │
│   │ (Open, Quick Look, Reveal, Copy Path, Clear Cache, New Document) │ │
│   └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Service Engine Layer                            │
│ ┌────────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │
│ │ PhotoshopRecentsEngine │ │ SpotlightSearch    │ │ ThumbnailService │ │
│ │ • mediabrowser.plist   │ │ • mdfind queries   │ │ • qlmanage engine│ │
│ │ • MachinePrefs.psp     │ │ • mdls metadata    │ │ • persistent disk│ │
│ │ • ExtendScript recents │ │ • multi-ext filter │ │   PNG cache      │ │
│ └────────────────────────┘ └────────────────────┘ └──────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │                    PhotoshopAutomationEngine                       │ │
│ │ • ExtendScript Cache Purge (All Caches, Clipboard, History)        │ │
│ │ • Disk Scratch & Caches Cleanup                                    │ │
│ │ • New Window / Document Creation                                   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        macOS System Interfaces                         │
│ • /usr/bin/mdfind & /usr/bin/mdls (Spotlight Index)                   │
│ • /usr/bin/qlmanage (Native QuickLook Thumbnail Generator)             │
│ • /usr/bin/osascript (AppleScript & Photoshop ExtendScript Bridge)    │
│ • ~/Library/Preferences (Adobe Plist & Prefs Store)                   │
│ • ~/Library/Caches/com.adobe.Photoshop (Disk Cache Subsystem)         │
└────────────────────────────────────────────────────────────────────────┘
```

## Module Architecture & Responsibilities

### 1. `PhotoshopRecentsEngine` (`src/services/recents.ts`)
- **Purpose**: Retrieve genuine recent Photoshop documents in true chronological order.
- **Workflow**:
  1. Checks if Photoshop is active: attempts quick AppleScript query for `app.recentFiles`.
  2. Parses `~/Library/Preferences/com.adobe.mediabrowser.plist` (using `plutil -convert xml1` stream) to retrieve historical `MRU.Photoshop.files`.
  3. Scans `~/Library/Preferences/Adobe Photoshop * Settings/MachinePrefs.psp` for recent path strings.
  4. Augments with Spotlight query: `mdfind "kMDItemContentType == 'com.adobe.photoshop-image' && kMDItemLastUsedDate != null"` sorted by date.
  5. Validates file existence via `fs.existsSync` to eliminate ghost/deleted files.
  6. Filters for valid extensions: `.psd`, `.psb`, `.psdt`, `.pdd`.

### 2. `SpotlightSearchEngine` (`src/services/search.ts`)
- **Purpose**: System-wide fast file querying with metadata extraction.
- **Query Strategy**:
  - Content types: `kMDItemContentType == 'com.adobe.photoshop-image'` OR file extension wildcard `kMDItemFSName == '*.psd'c || kMDItemFSName == '*.psb'c || kMDItemFSName == '*.psdt'c`.
  - Scopes: Scoped to user home directory (`~`) by default or full volume (`/`) configurable via user preference.
  - Uses `mdls` to extract:
    - Dimensions: `kMDItemPixelWidth`, `kMDItemPixelHeight`
    - Color Space: `kMDItemColorSpace`
    - Layer names: `kMDItemLayerNames`
    - Creator & DPI: `kMDItemCreator`, `kMDItemResolutionHeightDPI`
    - Last Modified & Added: `kMDItemContentModificationDate`, `kMDItemDateAdded`

### 3. `ThumbnailService` (`src/services/thumbnails.ts`)
- **Purpose**: Render real PNG images of PSD files for grid card thumbnails and Quick Look previews.
- **Storage**: `${environment.supportPath}/thumbnails`
- **Cache Key**: `hash(filePath + ":" + mtimeMs) + ".png"`
- **Generation**:
  - Checks if cache file exists; returns cached PNG path immediately.
  - If missing, executes `qlmanage -t -s 512 -o <cacheDir> "<filePath>"` with a strict 3-second timeout.
  - Renames output `<filename>.png` to `<hashKey>.png`.
  - Fallback: returns bundled `extension-icon.png` if file is unreadable or thumbnail extraction fails.
- **Quick Look Integration**:
  - Both Grid and List items assign `quickLook={{ path: thumbnailPngPath || filePath, name: item.name }}`.
  - Hitting `⌘Y` renders the actual artwork preview in full resolution.

### 4. `PhotoshopAutomationEngine` (`src/services/automation.ts`)
- **Cache Purging**:
  - ExtendScript: `app.purge(PurgeTarget.ALLCACHES)` via AppleScript.
  - Disk: Scans and cleans `~/Library/Caches/com.adobe.Photoshop` and temporary scratch files.
  - Calculates freed space in MB and notifies via Raycast Toast.
- **New Window / Document**:
  - Brings Photoshop to foreground via AppleScript.
  - Simulates native `Cmd+N` or calls `app.documents.add()` to trigger the native new document flow.

### 5. `Preferences & Storage` (`src/types/preferences.ts`)
- Storage key: `photoshop_view_mode` (`"grid" | "list"`).
- Persisted using Raycast `LocalStorage` so switching views persists across launches.
- Configurable settings in `package.json`:
  - `defaultViewMode`: "grid" | "list"
  - `gridItemSize`: "small" | "medium" | "large"
  - `searchScope`: "home" | "all"

## Security & Safety Guardrails
- **No Shell Injection**: All subprocess calls use `execFile` from `node:child_process` with argument arrays instead of raw string command lines.
- **Sandboxed Cache**: Thumbnails are stored strictly within the extension's designated `environment.supportPath`.
- **Zero Telemetry**: All operations run locally on the user's macOS filesystem.
