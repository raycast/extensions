# WallpaperEngine Raycast Extension — Design Document

**Date:** 2026-06-13
**Status:** Approved
**Author:** hunter_dermott

## 1. Overview

This document describes the design for expanding a Raycast extension to expose all WallpaperEngine CLI commands as Raycast commands. The extension will support simple instant commands, monitor selection, and complex interactive commands requiring wallpaper/playlist/profile browsing.

## 2. Goals

- Implement all 13 WallpaperEngine CLI commands as Raycast commands
- Support monitor selection for multi-monitor setups
- Enable wallpaper discovery via filesystem scanning of Steam Workshop + local projects
- Provide a fallback manual path setting in Raycast preferences
- Maintain a clean, modular architecture with shared utilities

## 3. Non-Goals

- Direct WallpaperEngine API integration (not exposed)
- Linux/macOS support (WallpaperEngine is Windows-only)
- Wallpaper preview thumbnails (requires extracting preview assets — out of scope)

## 4. CLI Commands to Implement

| CLI Command | Raycast Command | Mode | Parameters |
|-------------|----------------|------|------------|
| `pause` | `pause` | no-view | — |
| `play` | `play` | no-view | — |
| `stop` | `stop` | no-view | — |
| `mute` | `mute` | no-view | — |
| `unmute` | `unmute` | no-view | — |
| `hideIcons` | `hideIcons` | no-view | — |
| `showIcons` | `showIcons` | no-view | — |
| `nextWallpaper` | `nextWallpaper` | no-view | monitor (optional) |
| `closeWallpaper` | `closeWallpaper` | no-view | monitor (optional) |
| `getWallpaper` | `getWallpaper` | view | monitor (optional) |
| `openWallpaper` | `openWallpaper` | view | file (browse), monitor (optional) |
| `openPlaylist` | `openPlaylist` | view | playlist (text input), monitor (optional) |
| `openProfile` | `openProfile` | view | profile (text input) |
| `applyProperties` | `applyProperties` | view | JSON (text input), monitor (optional) |

## 5. Architecture

### 5.1. Shared Utilities

All utilities live under `src/utils/`:

| File | Purpose |
|------|---------|
| `src/utils/types.ts` | Shared TypeScript interfaces (WallpaperInfo, MonitorInfo, etc.) |
| `src/utils/cli.ts` | `execWallpaperEngine(args)` — finds wallpaper32/64.exe, executes with spawn, handles stdout/stderr |
| `src/utils/discovery.ts` | Steam path resolution (registry → libraryfolders.vdf → directories), wallpaper metadata scanning, caching in Raycast LocalStorage |
| `src/utils/monitors.ts` | Enumerates Windows monitors via PowerShell WMI, returns index + name + resolution |
| `src/utils/prefs.ts` | Reads Raycast preferences including optional `wallpaperEnginePath` override |

### 5.2. Wallpaper Discovery Flow

```
Raycast preference: wallpaperEnginePath (optional override)
        ↓
    If not set:
        Check Windows Registry
            HKLM\Software\Valve\Steam\InstallPath
        ↓
        Parse steamapps/libraryfolders.vdf
        → Collect all Steam library directories
        ↓
        Scan each library:
            steamapps/workshop/content/431960/   (Workshop wallpapers)
            steamapps/common/wallpaper_engine/projects/myprojects/   (Local projects)
        ↓
        Parse project.json in each wallpaper directory:
            → Extract: title, type, file path
        ↓
        Cache in Raycast LocalStorage with timestamp
        → Provide "Refresh" action to invalidate cache
```

### 5.3. Command File Structure

```
src/
├── commands/
│   ├── pause.ts
│   ├── play.ts
│   ├── stop.ts
│   ├── mute.ts
│   ├── unmute.ts
│   ├── hideIcons.ts
│   ├── showIcons.ts
│   ├── nextWallpaper.ts
│   ├── closeWallpaper.ts
│   ├── getWallpaper.ts
│   ├── openWallpaper.tsx     (view command)
│   ├── openPlaylist.tsx      (view command)
│   ├── openProfile.tsx       (view command)
│   └── applyProperties.tsx   (view command)
├── utils/
│   ├── types.ts
│   ├── cli.ts
│   ├── discovery.ts
│   ├── monitors.ts
│   └── prefs.ts
└── index.ts                  (Raycast entry point, if needed)
```

### 5.4. UI Modes

- **no-view:** Simple commands that execute immediately. Show Toast on success/error.
- **view:** Complex commands using `List` for selection, `Form` for text input, or `Detail` for info display.

### 5.5. Error Handling

- If Steam/WallpaperEngine cannot be found:
  - Show Toast error with instructions
  - Provide link to open Raycast preferences
- If `wallpaper32.exe` is missing, try `wallpaper64.exe` and vice versa
- All CLI stderr output surfaced as error messages
- Discovery failures log to Raycast console but don't block commands that don't need it

### 5.6. Preferences

| Preference | Type | Default | Description |
|------------|------|---------|-------------|
| `wallpaperEnginePath` | string | (auto-detect) | Optional override path to wallpaper_engine directory |
| `autoRefresh` | boolean | false | Whether to auto-refresh wallpaper cache on extension launch |

## 6. Data Flow

### 6.1. Simple Command (e.g., pause)

1. User runs `pause` command
2. `cli.ts` resolves wallpaper engine path
3. Spawns `wallpaper32.exe -control pause`
4. Shows Toast on completion

### 6.2. Complex Command (e.g., openWallpaper)

1. User runs `openWallpaper` command
2. `List` view loads, calls `discovery.ts` to get cached wallpaper list
3. User searches and selects a wallpaper
4. `List` navigates to monitor selection (if multiple monitors)
5. `cli.ts` executes with `-control openWallpaper -file <path> -monitor <index>`
6. Shows Toast

### 6.3. Monitor Selection

1. `monitors.ts` calls PowerShell to enumerate monitors
2. Returns list of `{ index, name, width, height }`
3. UI shows `List` with monitor info + current wallpaper (from `getWallpaper`)
4. User selects monitor or "All Monitors" (default: primary, monitor 0)

## 7. Testing Approach

- Manual testing on Windows with WallpaperEngine installed
- Verify each CLI command maps correctly to spawned process
- Verify discovery works with default and custom Steam paths
- Verify monitor enumeration returns correct indices
- Edge cases: missing WallpaperEngine, no Steam path, no monitors

## 8. Future Enhancements

- Wallpaper preview thumbnails (extract from `preview.jpg` in wallpaper directory)
- Favorites / quick-access list
- Playlist/profile discovery (if CLI ever exposes this)
- Auto-detect wallpaper changes and refresh cache

## 9. Appendix: CLI Reference

Full WallpaperEngine CLI reference: https://help.wallpaperengine.io/en/functionality/cli.html
