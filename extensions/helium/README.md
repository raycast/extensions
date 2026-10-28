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

Requires [Helium for Windows](https://github.com/imputnet/helium-windows). The extension finds it automatically:
first the standard install roots (`%LOCALAPPDATA%\imput\Helium` and the Program Files equivalents), then the path
Helium's installer registers under `Clients\StartMenuInternet`, which covers installs on other drives or in custom
folders. Portable zip builds register nothing — for those, set **Helium Location** in the extension preferences to the
full path of Helium's `chrome.exe`.

**Search Tabs works differently on Windows.** Chromium exposes no scripting interface there, so tabs are read through
[Raycast's browser extension](https://www.raycast.com/browser-extension) — install it in Helium, otherwise the tab list
stays empty. Selecting a tab focuses it through the Windows accessibility tree, matching on the tab's title; if the page
has retitled itself since the list was read, the URL is opened instead. Closing tabs and deduplicating tabs have no
Windows equivalent and are hidden.

Note that Raycast's browser extension reports tabs from every browser it is installed in, and its API does not say which
browser a tab belongs to. If you also run it in another Chromium browser, those tabs appear in this list as well.

**Open New Tab focuses Helium on Windows.** Chromium's command line can add a tab to an existing window only for
ordinary web addresses — `chrome://new-tab-page/` always opens a *new window* — so the command brings Helium forward and
sends `Ctrl+T` to get a real new tab. If Helium isn't running, or its window can't be focused, it falls back to opening
the new tab page in a new window.

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
