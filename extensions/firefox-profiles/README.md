# Firefox Profiles

Switch between Firefox profiles and search their open tabs without leaving Raycast.

## Commands

- **Open Firefox Profile** — Search your profiles and bring the selected profile to the foreground. If it is not running, the command opens it. If Firefox is still running without a window, the command restores it with a new window.
- **Search Firefox Tabs** — Search tabs saved by every Firefox profile. Results show the owning profile and open in that profile.

## Requirements

- macOS 12 or newer
- Firefox installed in `/Applications`, or selected in the command preferences

The extension supports Firefox's current Profile Groups system and the legacy `profiles.ini` format. Tab results come from Firefox's local session-recovery files, so a newly opened tab can take a few seconds to appear.

## Privacy

All profile and tab data is read locally from Firefox's Application Support directory. Nothing is uploaded or sent to an external service.

## Development

```bash
npm install
npm run build-native
npm run dev
```

The small native helper used for per-profile window detection is built from [`native/firefox-window-helper.swift`](native/firefox-window-helper.swift). `npm run build-native` produces a universal Apple Silicon and Intel binary.
