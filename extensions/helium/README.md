# Helium

Navigate open tabs, browsing history, bookmarks, and the web in Helium browser.

## Features

- **Search Tabs** - Find and switch between open tabs
- **Search Web** - Search using Helium's current provider and native bangs
- **Search History** - Search Helium browsing history
- **Search Bookmarks** - Quick access to saved bookmarks
- **New Tab/Window** - Open new tabs, windows, or incognito windows

## Platform Support

| Command                                   | macOS | Windows                             |
| ----------------------------------------- | ----- | ----------------------------------- |
| Search Web                                | ✅    | ✅                                  |
| Search History                            | ✅    | ✅                                  |
| Search Bookmarks                          | ✅    | ✅                                  |
| Open New Tab / Window / Incognito Window  | ✅    | ✅                                  |
| Search Tabs                               | ✅    | ⚠️ Read-only (see below)            |

### Windows

Requires [Helium for Windows](https://github.com/imputnet/helium-windows). The extension finds it automatically at
`%LOCALAPPDATA%\imput\Helium` (and the Program Files equivalents). For portable or custom installs, set **Helium
Location** in the extension preferences to the full path of Helium's `chrome.exe`.

**Search Tabs is read-only on Windows.** Chromium exposes no scripting interface there, so tabs are read through
[Raycast's browser extension](https://www.raycast.com/browser-extension) — install it in Helium, otherwise the tab list
stays empty. Selecting a tab opens its URL in Helium rather than focusing the existing tab, and closing tabs and
deduplicating tabs are unavailable.

Windows shortcuts use `Ctrl`/`Alt` wherever this document mentions `⌘`/`⌥`.

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

- Full tab control on Windows if Helium ever exposes a scripting/automation interface
- Find better workarounds for Space switching
  - Might look into pushing a PR to Helium directly if necessary
- Tab groups visualization
