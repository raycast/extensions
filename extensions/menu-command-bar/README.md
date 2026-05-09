# Menu Command Bar

Search and invoke menu items in the frontmost app — like Raycast's built-in **Search Menu Items**, but with **per-app memory of recently used items** so the things you keep using stay at the top.

## Features

- **Reliable invocation.** Drives menus through the macOS Accessibility API directly (`AXUIElementPerformAction`), so it works in apps where AppleScript-based menu pickers fail — including Adobe InDesign, Illustrator, and Photoshop.
- **Recent items pinned to the top.** Each app gets its own MRU list. Re-using the same menu item is a one-keystroke action the second time.
- **Keyboard shortcuts shown inline.** Each row displays its native shortcut as a side accessory — passive learning for the items you use most.
- **Per-app preference for how many recents to show** (default 8).

## Setup

This extension uses the macOS Accessibility API to read another app's menu bar. macOS will prompt to grant Raycast itself Accessibility permission the first time you invoke a menu item:

1. Open **System Settings → Privacy & Security → Accessibility**
2. Enable **Raycast**

Most users already have this granted for other Raycast features.

## How it works

A small Swift helper binary (`assets/menubar-helper`, source in `assets/menubar-helper.swift`) walks the frontmost app's `AXMenuBar` and emits the full menu tree as JSON. The Raycast command renders that as a searchable list, sorts recent items to the top from `LocalStorage`, and asks the helper to invoke whichever item you pick by calling `kAXPressAction` directly on the AX element. No AppleScript, no `osascript` — which is what makes it work in apps that have dynamic or non-standard menu hierarchies.

## Privacy

All recently-used data is stored locally in Raycast's own `LocalStorage` (per-app, keyed by bundle identifier). Nothing leaves your Mac.
