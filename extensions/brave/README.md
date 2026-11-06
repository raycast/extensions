# Brave Extension

- Open a new tab, window, or incognito window
- Search and jump to currently open tabs in Brave Browser
- Search and open Brave tabs from search query based on browser history across all profiles.
- Search and open Brave tabs from search query based on bookmarks across all profiles.

## macOS

Opening a tab in a different profile creates a new profile window. You can customize the default tab opening behaviour in preferences. In `Default` mode, tabs open in the topmost window when multiple profiles are open, due to limitations in the Brave Browser API.

Moving existing tabs to another window, running bookmarklets, and extracting page favicons through Apple Events are available on macOS only.

## Windows

Supports Brave, Brave Beta, and Brave Nightly. Select your channel in preferences; for custom installations, set the executable and User Data directory there as well.

Search Tabs requires the [Raycast browser extension](https://raycast.com/browser-extension) installed in Brave. It may also list tabs from other connected browsers and omit some internal or local pages. Switching matches tabs by title in the selected Brave installation, so duplicate or changed titles can prevent selecting the intended tab.

The other commands work without the browser extension. Bookmarklets can be copied, but cannot be run from Raycast.
