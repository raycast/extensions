# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fully-featured Raycast extension for browsing and playing SomaFM internet radio stations. The extension provides multiple ways to access and play stations, including a browse interface and menu bar access.

## Development Commands

```bash
npm run dev        # Start development mode (hot-reload)
npm run build      # Build the extension
npm run lint       # Run ESLint
npm run fix-lint   # Auto-fix linting issues
npm run publish    # Publish to Raycast Store
```

## Architecture

### Extension Structure
- **Commands**: Two commands defined in `package.json`:
  1. `index` - Main browse interface (Grid/List view)
  2. `menu-bar` - Menu bar extension for quick access to favorites

### Main Components
- **src/index.tsx** - Main browsing interface with Grid/List views
- **src/menu-bar.tsx** - Menu bar interface for favorite stations
- **src/types/** - TypeScript interfaces (Station, Playlist)
- **src/utils/** - Core utilities:
  - `api.ts` - Fetches station data from SomaFM API
  - `player.ts` - Handles stream playback with player detection
  - `storage.ts` - LocalStorage for favorites and recently played
- **src/hooks/** - Custom React hooks:
  - `useFavorites` - Manages favorite stations
  - `useViewMode` - Grid/List view toggling
  - `useViewOptions` - Sorting and grouping preferences

### Key Features
1. **Smart Player Detection** - Automatically detects and uses IINA, VLC, or Music.app
2. **PLS File Parsing** - Extracts direct stream URLs from playlist files
3. **Multiple Access Methods**:
   - Browse interface with search and filtering
   - Menu bar for instant access to favorites
4. **Persistent Storage** - Favorites, recently played, and view preferences
5. **Genre Splitting** - Handles pipe-separated genres (e.g., "jazz|lounge")

### Data Flow
1. Stations fetched from https://somafm.com/channels.json
2. Cached in memory during session
3. Player detection happens on each play action
4. PLS files parsed to get direct stream URLs
5. LocalStorage used for user preferences

## Important Implementation Notes

### Always Run Linting
After making changes, always run:
```bash
npm run lint
npm run typecheck  # if available
```

### Station Display
- Stations appear in multiple sections if they qualify (favorites, recently played, all)
- Genre grouping creates separate sections with stations appearing in each relevant genre
- Sorting affects all sections consistently

### Testing
- Test with different media players installed/uninstalled
- Verify PLS file parsing works for all stations
- Check that favorites persist across sessions
- Ensure recently played list updates correctly