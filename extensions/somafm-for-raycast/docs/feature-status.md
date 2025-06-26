# SomaFM for Raycast - Feature Status

## ✅ Completed Features

### Phase 1: Basic Playback (MVP) - 100% Complete
- [x] Fetch stations from SomaFM API
- [x] Display stations in a simple list
- [x] Play station using system command with smart player detection
- [x] Basic search by station name, genre, and description

### Phase 2: Enhanced UI - 100% Complete
- [x] Add grid view with artwork (3-column layout)
- [x] Implement favorites using Raycast LocalStorage
- [x] Add recently played tracking (last 5 stations)
- [x] Genre filtering with pipe-separated genre support
- [x] Keyboard shortcuts (1-9 quick play, ⌘+D favorite, etc.)
- [x] View toggle between Grid/List (⌘+Shift+V)
- [x] Sort by name or listeners with directional indicators
- [x] Group by genre option

### Phase 3: Advanced Features - 40% Complete
- [ ] Stream quality selection (currently defaults to MP3)
- [x] Now playing information with auto-refresh
- [x] Background refresh of station data (30-second intervals)
- [ ] Export favorites
- [ ] Notifications for favorite stations

### Phase 4: Player Integration - 50% Complete
- [x] Detect installed players (VLC, IINA, Music.app)
- [ ] Player-specific controls
- [x] Quick switch between stations (number keys)
- [ ] Playback history beyond recently played

### Bonus Features (Not in original plan)
- [x] Menu Bar extension for instant access
- [x] PLS playlist file parsing
- [x] Smart favorites display (always visible, even during search)
- [x] Last updated timestamp in refresh action

## 🚧 Remaining Features

### High Priority
1. **Export/Import Favorites** - Allow users to backup and share favorites
2. **Stream Quality Selection** - Let users choose between MP3/AAC and bitrates
3. **Caching for Offline** - Cache station data for offline browsing

### Medium Priority
1. **Notifications** - Notify when favorite stations have special programs
2. **Player Controls** - Pause/resume if player supports it
3. **Statistics** - Show listening history and stats

### Low Priority
1. **Themes** - Dark/light mode preferences
2. **Custom Sorting** - Save custom sort preferences
3. **Social Features** - Share what you're listening to

## 📊 Progress Summary

- **Phase 1**: ✅ 100% Complete
- **Phase 2**: ✅ 100% Complete  
- **Phase 3**: 🚧 40% Complete
- **Phase 4**: 🚧 50% Complete
- **Overall**: ~73% Complete

## 🎯 Next Steps

1. **Stream Quality Selection** - Add UI to select format and bitrate
2. **Export Favorites** - Add action to export favorites as JSON/OPML
3. **Offline Caching** - Implement proper caching with TTL

## 📝 Notes

- The extension has exceeded initial expectations with menu bar integration
- User feedback has been incorporated (genre splitting, sort options, favorites visibility)
- Performance is excellent with 40+ stations
- Auto-refresh for now playing works smoothly without disrupting UX