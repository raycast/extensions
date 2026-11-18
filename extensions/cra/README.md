# Cra

Search your [Cra](https://github.com/VictorKildahl/cra) tabs, spaces, history and downloads, and open new tabs and windows from anywhere.

> **This is a fork.** It is based on the [Arc extension](https://github.com/raycast/extensions/tree/main/extensions/arc) from the `raycast/extensions` repository (MIT, Copyright (c) 2021 Raycast, original author `thomas` and contributors). The code was adapted for Cra, whose AppleScript dictionary mirrors Arc's. Arc-only features (Little Arc, Easel, Boosts, Blank window, Reset tabs) were removed. This extension is not affiliated with The Browser Company or the Cra project.

## Commands

**Search**

- **Search Cra**: Tabs, history and search suggestions in one place.
- **Search Tabs**: All your open tabs.
- **Search Space Tabs**: Tabs in your current space.
- **Search Spaces**: Jump to a space.
- **Search History**: Your browsing history.
- **Search Downloads**: Your downloads.

**Open**

- **Open New Tab**: In the current window.
- **Open New Window** and **Open New Incognito Window**.
- **Access Spaces and Favorites**: Your spaces and favorites in the menu bar.

## Use it with Raycast AI

Mention `@cra` in Raycast AI to ask about your tabs and history. For example, "which tab has the Linear issue I was reading?" It can also open windows, open and close tabs, and switch spaces.

## Notes

- History and downloads are read from Cra's Chromium profile (`~/Library/Application Support/Cra/Chromium/Default/History`). Only the default profile is read.
- Tab and space commands only work with a running Cra window (they use Cra's AppleScript support).
