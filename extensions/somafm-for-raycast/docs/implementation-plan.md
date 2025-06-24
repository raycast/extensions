# SomaFM for Raycast - Implementation Plan

## Overview
This document outlines the implementation plan for a Raycast extension that allows users to browse and play SomaFM radio stations directly from Raycast.

## Project Goals
- Browse all available SomaFM stations
- Search stations by name, genre, or description
- Play stations using the system's default audio player
- View current playing information
- Quick access to favorite stations
- Show station artwork and metadata

## Technical Architecture

### 1. Data Source
SomaFM provides a JSON API with all station information:
- **Endpoint**: `https://somafm.com/channels.json`
- **Format**: JSON array with station objects
- **Key fields**:
  - `id`: Station identifier
  - `title`: Station name
  - `description`: Station description
  - `dj`: DJ/Curator information
  - `genre`: Music genre
  - `image`: Station artwork URL
  - `playlists`: Array of stream URLs (different formats/qualities)

### 2. Audio Playback Strategy
Since Raycast extensions run in Node.js without direct audio playback capabilities, we'll use system commands:

**Option A: Open stream URL in default browser/player**
- Use `open` command on macOS
- Pros: Simple, works with user's preferred player
- Cons: Less control over playback

**Option B: Use VLC or IINA if installed**
- Check if VLC/IINA is installed
- Launch with stream URL
- Pros: Better playback control
- Cons: Requires specific player

**Option C: AppleScript to control Music.app**
- Use AppleScript to add stream to Music.app
- Pros: Native macOS integration
- Cons: More complex, Music.app specific

**Recommendation**: Start with Option A, add Option B as enhancement

### 3. Extension Structure

```
src/
├── index.tsx                 # Main list view of all stations
├── play-station.tsx          # Command to play a specific station
├── components/
│   ├── StationList.tsx      # List component for stations
│   └── StationItem.tsx      # Individual station item
├── hooks/
│   ├── useStations.ts       # Hook to fetch/cache stations
│   └── useFavorites.ts      # Hook for managing favorites
├── utils/
│   ├── api.ts               # SomaFM API client
│   ├── player.ts            # Audio player utilities
│   └── storage.ts           # Local storage for favorites/history
└── types/
    └── station.ts           # TypeScript interfaces
```

### 4. User Interface Components

#### Main List View (`index.tsx`)
- Grid/List view toggle
- Search bar with real-time filtering
- Sections: Favorites, Recently Played, All Stations
- Station items show:
  - Artwork thumbnail
  - Station name
  - Genre badge
  - Currently playing info (if available)
  - Listener count

#### Station Actions
- **Primary**: Play Station
- **Secondary Actions**:
  - Add/Remove from Favorites
  - Copy Stream URL
  - Open in Browser
  - View Station Details

#### Station Detail View
- Full artwork
- Extended description
- Stream quality options
- DJ/Curator information
- Social links

### 5. Implementation Phases

#### Phase 1: Basic Playback (MVP)
1. Fetch stations from SomaFM API
2. Display stations in a simple list
3. Play station using `open` command
4. Basic search by station name

#### Phase 2: Enhanced UI
1. Add grid view with artwork
2. Implement favorites using Raycast LocalStorage
3. Add recently played tracking
4. Genre filtering
5. Keyboard shortcuts

#### Phase 3: Advanced Features
1. Stream quality selection
2. Now playing information
3. Background refresh of station data
4. Export favorites
5. Notifications for favorite stations

#### Phase 4: Player Integration
1. Detect installed players (VLC, IINA)
2. Player-specific controls
3. Playback history
4. Quick switch between stations

## Data Models

### Station Interface
```typescript
interface Station {
  id: string;
  title: string;
  description: string;
  dj: string;
  genre: string;
  image: string;
  largeimage: string;
  xlimage: string;
  twitter: string;
  updated: string;
  playlists: Playlist[];
  listeners: number;
}

interface Playlist {
  url: string;
  format: string;
  quality: string;
}
```

### Local Storage Schema
```typescript
interface StorageSchema {
  favorites: string[];              // Array of station IDs
  recentlyPlayed: RecentItem[];     // Last 10 played stations
  settings: UserSettings;
}

interface RecentItem {
  stationId: string;
  playedAt: Date;
}

interface UserSettings {
  defaultQuality: 'highest' | 'lowest' | 'specific';
  preferredFormat: 'mp3' | 'aac' | 'any';
  viewMode: 'grid' | 'list';
}
```

## API Integration

### Caching Strategy
- Cache station data for 1 hour
- Store in Raycast cache
- Background refresh when stale
- Offline fallback to cached data

### Error Handling
- Network errors: Show cached data with warning
- Player errors: Fallback to browser
- API changes: Graceful degradation

## Development Workflow

### Setup
1. Install dependencies
2. Set up TypeScript types
3. Configure ESLint rules
4. Create utility functions

### Testing Approach
- Manual testing with Raycast development mode
- Test different audio players
- Test offline scenarios
- Performance testing with large lists

### Publishing Checklist
- [ ] All features working
- [ ] Error handling complete
- [ ] Performance optimized
- [ ] Icons and assets included
- [ ] Store metadata updated
- [ ] Screenshots captured

## Future Enhancements
- Integration with Last.fm scrobbling
- Sleep timer functionality
- Station recommendations
- Community features (share favorites)
- Widget for menu bar
- iOS Raycast app support

## Technical Considerations

### Performance
- Lazy load images
- Virtualized lists for many stations
- Debounced search
- Efficient caching

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode support

### Security
- No sensitive data stored
- HTTPS for all requests
- Validate all external data

## Timeline Estimate
- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 4-5 days
- Phase 4: 3-4 days

Total: ~2-3 weeks for full implementation

## Design Decisions (Phase 1 MVP)

### Resolved Decisions
1. **Display**: Text-only list view (no artwork in MVP)
2. **Metadata**: Minimal - Station name, genre, listener count
3. **Playback**: MP3 format by default, using system `open` command
4. **UI Behavior**: Close Raycast after station selection
5. **Data Fetching**: No caching, fetch fresh data each time
6. **Error Handling**: Show toast message for API failures
7. **Search**: Include name, genre, and description (prioritize name matches)

### Deferred to Future Phases
1. Station artwork in list view
2. Quality/format selection
3. Caching for offline support
4. Playback feedback/confirmation
5. Grid view option
6. Advanced player integration

## Design Decisions (Phase 2)

### Resolved Decisions
1. **Default View**: Grid view with 3 columns (toggle available for list)
2. **Grid Display**: Show station image, title, and genre
3. **Favorites**: 
   - Display at top of list
   - Use star icon (matching SomaFM site)
   - Keyboard shortcut for toggle (⌘+F)
4. **Recently Played**: 
   - Track 5 most recent stations
   - Show in separate section
5. **Keyboard Shortcuts**: 
   - Number keys (1-9) for quick access
   - ⌘+F for favorite toggle
   - ⌘+R for refresh
6. **Implementation Priority**:
   - Grid view with images (first)
   - Favorites system
   - Recently played tracking
   - View toggle
   - Additional shortcuts

## Questions to Resolve
1. Should we support multiple players or stick with system default?
2. How much station metadata should we display?
3. Should we add recording functionality?
4. Do we need offline playback support?
5. Should we integrate with other music services?