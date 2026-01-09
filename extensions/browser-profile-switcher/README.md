# Browser Profile Switcher

Quickly cycle between browser windows and profiles with a single command. Perfect for users who work with multiple browser profiles (work, personal, clients) or simply have many browser windows open.

## Features

- **Instant Window Cycling** — Rotate through all open browser windows with one keystroke
- **Auto-detect Browser** — Automatically detects and uses your default browser
- **Smart Launch** — Launches the browser if it's not running, or opens a new window if none exist
- **Multiple Browser Support** — Works with all major browsers
- **Configurable Notifications** — Toggle toast messages on/off

## Supported Browsers

| Browser | Supported |
|---------|-----------|
| Google Chrome | ✅ |
| Safari | ✅ |
| Microsoft Edge | ✅ |
| Brave Browser | ✅ |
| Vivaldi | ✅ |
| Opera | ✅ |
| Chromium | ✅ |

## How It Works

Each browser window typically represents a different profile. This extension cycles through your browser windows by bringing the last window to the front, effectively rotating through all your profiles.

| Scenario | Action |
|----------|--------|
| Browser not running | Launches the browser |
| No windows open | Opens a new window |
| One window open | Activates that window |
| Multiple windows | Cycles to the next window |

## Configuration

Open extension preferences (`⌘ + ,`) to configure:

### Default Browser
Choose which browser to control:
- **Auto-detect** (default) — Uses your system's default browser
- Or manually select: Chrome, Safari, Edge, Brave, Vivaldi, Opera, or Chromium

### Show Toast Messages
Toggle whether to display notifications when switching profiles.

## Use Cases

- **Multiple Work Profiles** — Quickly switch between different client or project profiles
- **Personal vs Work** — Separate browsing contexts for work and personal use
- **Development Testing** — Test with different user sessions or cookies
- **Privacy** — Keep different browsing contexts isolated

## Requirements

- macOS
- One of the supported browsers installed

## License

MIT
