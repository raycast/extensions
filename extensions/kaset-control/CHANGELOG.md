# Changelog

## [Queue, YouTube Search and History] - 2026-10-31

### Added

- Now Playing rebuilt around Kaset's queue: queue, recently played and up next in one list, with live progress and full playback controls
- Album names resolved by searching YouTube Music, since Kaset's player payload does not include them
- YouTube search in Play Song, merged with YouTube Music and filterable by source
- Queue actions: play now, remove from queue, play next, add to queue
- Recently played history recorded in the background without a menu bar item
- Track Info view (`⌘I`) with large artwork and a metadata column

### Changed

- Upgraded to `@raycast/api` 2.8.2
- Menu bar player: artwork or progress-ring icon, marquee titles, hide when idle

## [Update] - 2026-05-05

### Added

- Play Song command to search YouTube Music and play selected songs in Kaset
- Support for Kaset AppleScript `play video "<videoId>"` playback

## [Initial Release] - 2026-02-16

### Added

- Menu bar player showing current track with configurable display style
- Now Playing view with artwork, progress bar, and full track details
- Playback controls: play/pause, next track, previous track
- Volume control with preset levels (0-100%)
- Shuffle mode toggle
- Repeat mode cycling (off, all, one)
- Mute toggle
- Like and dislike track actions
- Keyboard shortcuts for all controls
- Auto-launch Kaset if not running
