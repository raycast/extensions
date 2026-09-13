# Audio Assistant Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Provide seven top-level commands: Music, Play / Pause, Next Track, Previous Track, Volume Up, Volume Down, and Toggle Mute.
- Browse Music Assistant players, artists, tracks, and albums from one searchable workspace.
- Toggle favorite status for the active player’s current track (Alt+F) or highlighted track (Alt+Shift+F), with configurable shortcuts and confirmed add/remove notifications.
- Add a Favorites view for server-marked tracks, artists, and albums, with favorite-only search, independent pagination, and partial-error recovery.
- Place the saved available output first in All for quick volume/mute access, with explicit recovery for unavailable outputs.
- Select and persist an active playback target for Music and the quick playback commands.
- Play music immediately, queue tracks next, append tracks, and inspect or edit the active queue.
- Inspect current playback with full cover art and metadata using the Now Playing Detail screen (`Alt + I`).
- Control playback, volume, mute, repeat, shuffle, and collection browsing with keyboard shortcuts.
- Customize action shortcuts in a searchable, grouped Keyboard Shortcuts screen inside Music (`Ctrl + Shift + .` on Windows; `Cmd + Shift + .` on macOS), with previews, conflict validation, and individual/all-default reset.
- Simplify Extension Preferences to connection settings and Demo Mode, with guidance to the shortcut editor. Preserve all default bindings and offer a first-run review of available legacy customizations.
- Contextual dual-function Mute/Unmute toggle with dynamic icon and toast feedback.
- Link compatible synced players from the Players workspace, with offline outputs in a separate section.
- Page library and queue results, and browse artist albums and tracks together on one screen.
- Preserve search warnings across pages and isolate inactive queue network errors during refresh.
- Display artist, album, and track artwork through Music Assistant's credential-free image proxy.
- Support Windows and macOS with an optional no-audio Demo Mode.
