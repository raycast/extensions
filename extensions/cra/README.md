# Cra

Search your [Cra](https://github.com/VictorKildahl/cra) tabs, spaces, history and downloads, and open new tabs and windows from anywhere.

> **This is a fork.** It is based on the [Arc extension](https://github.com/raycast/extensions/tree/main/extensions/arc) from the `raycast/extensions` repository (MIT, Copyright (c) 2021 Raycast, original author `thomas` and contributors). The code was adapted for Cra, whose AppleScript dictionary mirrors Arc's. Cra's own versions of Little Arc (Little Window), Easels, Boosts and the other Arc commands are included. This extension is not affiliated with The Browser Company or the Cra project.

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
- **Open New Window**, **Open New Blank Window** and **Open New Incognito Window**.
- **Open New Little Window**: A URL or search in Cra's small floating window.
- **Open New Easel**, **Open Cra Boost Gallery**, **Open Cra Release Notes** and **Reset All Tabs in Current Space** (disabled by default, enable them in Raycast).
- **Access Spaces and Favorites**: Your spaces and favorites in the menu bar.

## Use it with Raycast AI

Mention `@cra` in Raycast AI to ask about your tabs and history. For example, "which tab has the Linear issue I was reading?" It can also open windows, open and close tabs, and switch spaces.

## Notes

- History is read from the Chromium profiles that Cra has on disk (`~/Library/Application Support/Cra/Chromium/<profile>/History`). Downloads are read from the default profile only.
- Open New Blank Window, Open New Easel and Reset All Tabs in Current Space click Cra's menu items, so Raycast needs Accessibility access for them. Cra has no scripting command for these.
- Tab, space and window commands talk to Cra through its AppleScript support. They start Cra and open a window if needed. The menu bar command never starts Cra: it stays empty while Cra is closed.
