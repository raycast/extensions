# Last.fm Changelog

## [Menu Bar Player, Now Playing & Love/Unlove] - 2026-05-27

### New Commands

- **Menu Bar Player** — Shows the currently playing track as "Song - Artist" in the macOS menu bar. Hides automatically when nothing is playing. Refreshes every 30 seconds via Background Refresh.
- **Now Playing** — Full detail view of the current track with album art, metadata, and love/unlove support.

### Love / Unlove Tracks

- Love and unlove the currently playing track from both the Now Playing command and the Menu Bar Player.
- Uses Last.fm's secure web authorization flow — no password required. A guided step-by-step connection page walks you through the two-step setup.
- Users without an API Secret see a contextual nudge in Now Playing metadata and the menu bar dropdown pointing them to preferences.

### Menu Bar Player

- Displays album art as the menu bar icon (configurable: Last.fm icon or album art).
- New preferences: **Now Playing Text Length** (truncate title, default 20 chars), **Hide Artist's Name**, **Cleanup Song Title** (strips feat., Remastered, Radio Edit, etc.).
- Dropdown sections: Open (Song / Artist / Album on Last.fm), Copy (Song & Artist, URLs), Last.fm (Love/Unlove or connection setup), Configure Command.
- Keyboard shortcuts: `⌘O` open song, `⌘⇧O` open artist, `⌘⌥O` open album, `⌘C` copy song & artist, `⌘⇧C` copy song URL, `⌘⌥C` copy artist URL, `⌘⌃C` copy album URL, `⌘L` love/unlove, `⌘,` configure.

### Now Playing

- Album art, track title, artist, and metadata links (Track / Artist / Album — derived from the Last.fm track URL, no extra API call).
- Actions: Love/Unlove, Open on Last.fm (Song / Artist / Album), Copy (Song & Artist, URLs).
- Metadata panel shows Last.fm account connection status; "Connect Last.fm Account" action opens the guided setup page.

### Other Improvements

- Open and copy links for Song, Artist, and Album added across all relevant commands.
- All deprecated Raycast APIs replaced (`Action.OpenInBrowser`, `Action.CopyToClipboard`, `Toast.Style`, `accessories`).
- Windows listed as a supported platform.
- `no-explicit-any` and `no-useless-escape` ESLint errors resolved across all hooks.

## [Initial Version] - 2022-01-17

- Initial release
