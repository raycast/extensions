# Product Requirements Document (PRD)

## Project Overview
**Photoshop Projects** is an open-source, production-grade Raycast extension designed specifically for digital artists, designers, and creators who work with Adobe Photoshop on macOS. It eliminates friction in finding, previewing, and managing Photoshop documents (`.psd`, `.psb`, `.psdt`) by providing instant visual search, recents tracking based on Photoshop's actual usage history, high-fidelity thumbnail rendering, Quick Look previews, cache purging, and new document creation.

## Objectives & Goals
1. **Frictionless Document Access**: Instant search and ranking of Photoshop files without waiting for heavy Creative Cloud apps to launch.
2. **Accurate Recents Ranking**: Reflect the true order of files opened inside the Adobe Photoshop application on macOS (using Photoshop MRU history and macOS file list metadata).
3. **Visual-First Experience**: Eliminate generic PSD icons in favor of genuine rendered PNG thumbnail previews in both Grid and List layouts.
4. **Instant Quick Look (`⌘Y`)**: Deliver instantaneous full-resolution visual previews directly in Raycast using generated PNG representations.
5. **Photoshop Utility Controls**: Provide immediate commands to clear Photoshop scratch/disk/memory caches and spawn new Photoshop project windows.
6. **Raycast Store Acceptance**: Meet all official Raycast store publishing guidelines, linting requirements, accessibility norms, and performance standards.

## Target Audience
- UI/UX and graphic designers who maintain hundreds of Photoshop project files across local drives and external volumes.
- Digital illustrators and photographers needing rapid visual previewing and searching by filename, directory, or layer metadata.
- Power users seeking quick actions to purge Photoshop memory caches without navigating nested menu bars.

## Supported Document Formats
- `.psd` (Photoshop Document)
- `.psb` (Photoshop Large Document Format)
- `.psdt` (Photoshop Document Template)
- `.pdd` (Legacy Photoshop PhotoDeluxe / Document)
- Case-insensitive matching (`.PSD`, `.PSB`, `.psd`, `.psb`)

## Core Features & Commands

### 1. Command: Recent Projects (`recent`)
- **Mode**: View (`Grid` default, toggleable to `List`).
- **Functionality**: Extracts and ranks documents by their actual last-opened timestamp in Adobe Photoshop on macOS.
- **Data Sources**:
  - Primary: Adobe Photoshop Media Browser MRU (`~/Library/Preferences/com.adobe.mediabrowser.plist`) and Machine Preferences (`MachinePrefs.psp`).
  - Active: Adobe Photoshop ExtendScript `app.recentFiles` via AppleScript if Photoshop is currently running.
  - Fallback: Spotlight metadata (`kMDItemLastUsedDate`) for Photoshop documents.
- **Visuals**: Displays high-resolution rendered thumbnail previews, document title, parent directory, file size, dimensions (width × height), and relative last-opened time.

### 2. Command: Search Projects (`search-projects`)
- **Mode**: View (`Grid` default, toggleable to `List`).
- **Functionality**: High-speed system-wide Spotlight querying via `mdfind` targeting all Photoshop document types with fuzzy matching.
- **Search Capabilities**: Search by file name, subfolder name, full path, or layer names.
- **Scope**: User configurable (Home directory default `~` or entire Mac `/`).
- **Layouts**:
  - **Grid View (Default)**: Visual card presentation showing rendered picture previews.
  - **List View**: Dense list presentation with side-panel details (dimensions, color space, layers count, DPI, file size, created/modified dates).

### 3. Quick Look Preview (`⌘Y`)
- Integrated with Raycast's `quickLook` property.
- When toggled, opens the high-resolution rendered PNG image rather than an unrendered generic document placeholder.

### 4. Command: Clear Photoshop Cache (`clear-cache`)
- **Mode**: No-view (Quick execution with Toast HUD notification).
- **Functionality**:
  - Purges active Photoshop runtime caches (all caches, history, clipboard) via Photoshop ExtendScript.
  - Cleans temporary disk caches in `~/Library/Caches/com.adobe.Photoshop` and orphaned scratch files.
  - Reports freed disk space and status via Raycast Toast.

### 5. Command: New Photoshop Window (`new-window`)
- **Mode**: No-view.
- **Functionality**: Launches/activates Adobe Photoshop and triggers the New Document creation window or standard preset.

### 6. Universal Action Panel Actions
Available on every item across both Recent and Search commands:
- **Open in Photoshop** (`↵`)
- **Quick Look Rendered Preview** (`⌘Y`)
- **Reveal in Finder** (`⌘↵`)
- **Toggle View Mode (Grid ⟷ List)** (`⌘V`)
- **Copy File Path** (`⌥⌘C`)
- **Copy File** (`⌘C`)
- **Clear Photoshop Cache** (`⌥⌘K`)
- **Create New Document** (`⌥⌘N`)
- **Open with Application...**
- **Move to Trash** (`⌫`)

## Non-Functional Requirements
- **Performance**: Initial results displayed in under 300ms. Asynchronous non-blocking thumbnail generation.
- **Safety**: Safe command execution using `execFile` without shell injection risks.
- **Offline Capable**: 100% local execution without external network telemetry.
- **Resilience**: Gracefully handles missing files, corrupt PSD headers, or uninstalled Photoshop.
