# Helium

Navigate open tabs, bookmarks, and the web in Helium browser.

## Features

- **Search Tabs** - Find and switch between open tabs
- **Search Web** - Search using Google, DuckDuckGo, Bing, Yahoo, or Ecosia
- **Search Bookmarks** - Quick access to saved bookmarks
- **New Tab/Window** - Open new tabs, windows, or incognito windows

### Experimental: macOS Spaces Support

⚠️ **Optional Feature (Disabled by Default)**

Enable "Space Switching" in extension preferences to automatically switch to Helium's macOS Space when selecting tabs.

**Why this workaround exists:** some browsers (e.g. Arc) implement a custom `select` command in their AppleScript dictionary that handles Space switching internally. Helium doesn't have this command, and external AppleScript can't force Space switching. This workaround exploits Raycast's `open()` API (which does trigger Space switching) by briefly opening/closing a temporary tab.

**How it works:** Opens a temporary tab -> Space switches -> Closes temp tab -> Switches to target tab. May cause a brief visual flicker.

**Default behavior:** Without this enabled, tab switching only works within your current Space (standard AppleScript behavior).

## Installation

Install from the Raycast Store.

## Contributing

**Via Raycast (recommended):**

1. Use the "Fork Extension" action in Raycast's root search
2. Run `npm install && npm run dev` from the extension folder

When submitting changes, add yourself to contributors in `package.json` and update `CHANGELOG.md`.

## Planned Features

- Find better workarounds for Space switching
  - Might look into pushing a PR to Helium directly if necessary
- !bang integration for search
- Tab groups visualization
