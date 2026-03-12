# Browser Profile Shortcuts

Browse, open, and focus Chromium browser profiles with keyboard shortcuts in Raycast.

## Features

- **Browse Profiles** — Lists all profiles across Google Chrome, Microsoft Edge, Brave, Vivaldi, and Arc
- **Open / Focus Profiles** — Opens a profile if not running, or brings its existing window to the front
- **Quicklinks** — Create Raycast quicklinks with hotkeys for instant profile switching
- **Favorites** — Pin frequently used profiles to the top of the list
- **Open Windows** — See all open browser windows with their profile names, and focus any window directly

## How It Works

When you trigger a profile that already has a window open, the extension identifies which window belongs to which profile by briefly opening an internal `chrome://version` page, reading the profile path, and closing it. This mapping is cached so subsequent focuses are instant.

Window focusing uses macOS Accessibility (`AXRaise`) to bring the specific window to front.

## Setup

1. Install the extension from the Raycast Store
2. Grant Raycast **Accessibility** permission: System Settings > Privacy & Security > Accessibility > enable Raycast
3. Open Raycast and type "Browse Profiles"

## Preferences

Enable or disable browsers individually in extension preferences:

| Preference | Default |
|------------|---------|
| Google Chrome | Enabled |
| Microsoft Edge | Enabled |
| Brave Browser | Enabled |
| Arc | Enabled |
| Vivaldi | Enabled |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Open / focus profile |
| `Cmd+L` | Create quicklink for profile |
| `Cmd+F` | Toggle favorite |
| `Cmd+R` | Refresh profile list |
