# Application Flow (AppFlow)

## Overview
This document specifies the interaction flows, navigation patterns, and keyboard shortcuts for the **Photoshop Projects** extension.

## User Journeys

```
                    ┌─────────────────────────────────┐
                    │       Raycast Root Search       │
                    └───────────────┬─────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      [Recent Projects]                          [Search Projects]
               │                                         │
               ├───────────────────┬─────────────────────┤
               ▼                                         ▼
       ┌───────────────┐                         ┌───────────────┐
       │   Grid View   │ ◄───────[ ⌘V ]────────► │   List View   │
       │ (Visual Cards)│   (Toggle View Mode)    │(Dense Details)│
       └───────┬───────┘                         └───────┬───────┘
               │                                         │
               ├───────────────────┬─────────────────────┤
               │                   │                     │
               ▼                   ▼                     ▼
         [ ↵ Open ]            [ ⌘Y Preview ]      [ ⌘K Actions ]
     (Adobe Photoshop)       (Rendered QuickLook)        │
                                                         ├─ Clear Cache (⌥⌘K)
                                                         ├─ New Document (⌥⌘N)
                                                         ├─ Reveal in Finder (⌘↵)
                                                         └─ Copy Path / File
```

---

### Journey 1: Accessing Recent Photoshop Projects
1. User activates Raycast (`⌥ Space` or `⌘ Space`).
2. Types `Recent Projects` (or custom hotkey) and hits `↵`.
3. The command immediately presents the **Grid View** (by default):
   - Items are sorted in chronological order of last use in Adobe Photoshop.
   - Each card displays the high-fidelity rendered PNG thumbnail of the PSD artwork.
   - Subtitle displays the parent folder name and relative time (e.g. `2 hours ago`).
4. **Interactions**:
   - `↵` (Enter): Opens the `.psd` directly in Adobe Photoshop.
   - `⌘Y`: Opens Quick Look showing the full-resolution rendered PNG preview.
   - `⌘V`: Toggles immediately to **List View** with metadata sidebar.
   - `⌘↵`: Reveals the file in macOS Finder.
   - `⌥⌘C`: Copies the absolute POSIX path to the clipboard.

---

### Journey 2: Searching All Photoshop Documents
1. User activates Raycast and selects **Search Projects**.
2. Typing a search query instantly filters across:
   - File name (case-insensitive fuzzy match)
   - Parent directory name
   - Photoshop Layer names (when indexed by Spotlight)
3. Results render in **Grid View** (default):
   - Cards display thumbnail image, title, dimensions (e.g. `1920 × 1080`), and file size.
4. User can switch to **List View** via `⌘V`:
   - Left panel shows filename, folder icon, size, and modified date.
   - Right panel (`List.Item.Detail`) shows comprehensive metadata:
     - Rendered preview image
     - Pixel dimensions & Aspect ratio
     - Color mode (RGB, CMYK, Grayscale) & Bit depth
     - Resolution DPI
     - Included Layer names list
     - File size in MB / KB
     - File location with clickable path

---

### Journey 3: Quick Look Rendered Art (`⌘Y`)
1. User highlights any Photoshop item in Grid or List view.
2. Presses `⌘Y` (Raycast Quick Look shortcut).
3. Instead of an unrendered icon or blank placeholder, Raycast opens the generated high-resolution PNG representation of the document.
4. User can zoom, inspect colors, or dismiss with `Esc`.

---

### Journey 4: Purging Photoshop Caches (`clear-cache`)
1. User triggers `Clear Photoshop Cache` command (or hits `⌥⌘K` from Action Panel).
2. The extension displays an animated Toast: `"Purging Photoshop caches..."`.
3. Backend performs:
   - In-memory cache purge via Photoshop ExtendScript (`PurgeTarget.ALLCACHES`).
   - Disk cleanup of temporary scratch files and WebKit/HTTP caches in `~/Library/Caches/com.adobe.Photoshop`.
4. Toast completes with success style: `"Photoshop cache cleared (freed 45.2 MB)"`.
