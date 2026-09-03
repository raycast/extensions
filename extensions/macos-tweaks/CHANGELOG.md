# macOS Tweaks Changelog

## [Windows & Stage Manager] - 2026-09-01

### New Category

- **Windows & Stage Manager** — 9 tweaks for `com.apple.WindowManager`, which was not covered at all
  - **Click Wallpaper to Show Desktop** — turn off Sonoma's behaviour of sweeping every window aside when you click the wallpaper
  - Stage Manager itself, auto-hiding its recent-apps strip, and whether clicking an app shows all its windows at once or one at a time
  - Hide desktop icons and desktop widgets, and hide widgets in Stage Manager separately
  - Margins between tiled windows (macOS 15+)
  - What a double-click on a window's title bar does — fill, zoom, minimise, or nothing

### AI Extension

- The extension is now usable from Raycast AI: ask for a setting in your own words and it will find it, tell you its current value, and change it for you
  - **Search Tweaks** and **Get Modified Tweaks** read your settings
  - **Apply Tweak** and **Reset Tweak** change them, and always show a confirmation first with the domain, key, current and new value, the `defaults` command, and which process will restart
  - Resetting a tweak that is already at its default asks for nothing, since there is nothing to undo

### Improved

- The detail pane is now native metadata instead of rendered markdown: status and risk read as coloured tags, and the domain, key and command line up as proper labels
- Tweaks can be searched by their `defaults` domain and key, not just by title — so a key copied from a guide finds the setting straight away
- The list appears immediately with the values from last time and refreshes in the background, instead of waiting on a read of all 129 settings
- The menu bar switches to one submenu per category once more than 12 tweaks are modified, instead of a flat list that ran off the bottom of the screen
- Added a **Risk** filter, and each tweak now shows whether it is safe or moderate risk

### New Tweaks

- **Desktop & Spaces** — a modifier key for each of the four hot corners, so they no longer trigger by accident; reduce wallpaper tinting in windows; switch to an app's space when activating it
- **Menu Bar & UI** — keep the menu bar visible in full screen; graphite appearance
- **Keyboard & Input** — smart quote styles for double and single quotes, with presets for English, French/Italian, German and Japanese
- **Screenshots** — show mouse clicks in screen recordings; screenshot destination (file, clipboard, Preview, Mail, Messages)

## [Raycast 2 Compatibility] - 2026-08-27

- Updated to `@raycast/api` 2.x

## [More Tweaks & Sound Category] - 2026-05-17

### New Category
- **Sound**: User Interface Sound Effects, Volume Change Feedback Sound

### New Tweaks (35)
- **Dock**: Magnification + Magnification Size, Show Only Open Apps (`static-only`), Launch Bounce Animation, Group Windows by App in Mission Control, Highlight Stack Items on Hover
- **Finder**: Allow Quitting Finder, Auto-Empty Trash After 30 Days, Show Hard/External/Removable/Mounted Servers on Desktop
- **Keyboard**: Press-and-Hold Key Repeat (Vim-friendly), Full Keyboard Access, Double-Space to Period
- **Trackpad & Mouse**: Mouse Tracking Speed, Tap-and-Drag (Drag Lock), Two-Finger Secondary Click
- **Screenshots**: Filename Prefix (Screenshot / Screen / Capture / Snap / Shot)
- **Safari**: Internal Debug Menu, Disable Search Engine Suggestions, Always Restore Session at Launch
- **Menu Bar & UI**: Show Sound, Battery Percentage, AirDrop, Screen Mirroring, Focus, Now Playing, Fast User Switching in the menu bar
- **Animations**: Reduce Motion and Reduce Transparency — perceived performance on older Macs
- **Security & Privacy**: Limit Ad Tracking, Personalized Apple Ads

### Improvements
- Detail view now displays macOS version constraints (`minMacOS` / `maxMacOS`) when set on a tweak

### Fixes
- Two-Finger Secondary Click: keep both built-in and Bluetooth trackpad domains in sync — previously the Bluetooth domain ended up with the opposite value

## [Initial Version] - 2026-04-30

- Browse Tweaks: list and toggle 73 hidden macOS settings across 13 categories
- My Tweaks: view modified settings, reset individually or all at once, export as shell commands
- Tweaks Menu Bar: quick access and toggle from the menu bar
- Detail panel with description, current/default values, domain, key, and full `defaults write` command
- Filter by category or status (All / Modified / Default)
- One-click toggle for boolean settings, dropdown for enum settings
- Safety warnings for moderate-risk tweaks
- Automatic process restart (Finder, Dock, SystemUIServer) after changes
