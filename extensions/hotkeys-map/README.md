# Raycast Hotkeys Map

An interactive macOS keyboard visualizer, conflict resolver, ergonomic advisor, and practice trainer for your Raycast hotkeys and aliases—paired with a quick-glance Menu Bar cheat sheet.

## Features

- **Interactive Keyboard Map:** ANSI & ISO layouts across MacBook, TKL (F-Row), and Full (Numpad) profiles with color-coded, toggleable groups.
- **Exact Modifier & Hyper Key Filtering:** Filter by `✦ Hyper`, `✦⇧ Hyper+Shift`, `⌃⌥`, `⇧⌘`, `⌥⌘`, `⇧⌥`, single modifiers, or `Double-Tap (×2)` with live physical key highlights (distinguishing the mapped Hyper Key from its underlying base modifiers).
- **Rebind, Clear & Ergonomic Suggestions:** Rebind or clear any shortcut directly from the Key Inspector, get one-click ergonomic & group-consistent free-key suggestions for Medium/Stretch bindings, rename shortcuts inline, and reassign groups.
- **Conflict Resolver & Multi-App Layers:** Detect duplicate Raycast bindings, coexistence clashes, and overlaps with macOS or other apps. Scan enabled macOS system shortcuts (`com.apple.symbolichotkeys.plist`), scan any running macOS app's menu bar, or import VS Code / Cursor / Obsidian keybindings JSON.
- **Practice & Productivity Tools:** Flashcard Practice Trainer (streak, accuracy, reaction time), Ergonomics & Hand-Balance Dashboard, Free Keys drafting mode, Heatmap, Live Keyboard Test, Aliases prefix-overlap audit, `⌘K` Command Palette, SVG Export, JSON Import/Export, and Print / PDF Cheat Sheet.
- **Hotkeys Menu Bar:** Quick-glance menu bar cheat sheet grouped by category with one-click launch into the full map.

## Free vs. Raycast Pro (Optional MCP Sync)

All core features—including the interactive keyboard map, Free Keys drafting, rebinding/clearing, ergonomic suggestions, conflict resolution, native app/macOS scanning, JSON import/export, practice trainer, and menu bar cheat sheet—work on **Raycast Free** with no extra setup.

If you have **Raycast Pro**, you can optionally connect to Raycast's local **MCP Server** (`http://127.0.0.1:8267/mcp`) for automatic live syncing of your Raycast hotkeys, aliases, and Hyper Key settings, plus one-click **Apply via MCP** for pending rebinds and clears:

1. In Raycast, open **Settings → MCP** (`raycast://settings/mcp`), enable the local MCP Server, and share the **Settings** extension.
2. Copy your local Bearer token.
3. In Raycast Hotkeys Map, open **Tools → MCP Sync**, paste the token (stored locally on your Mac only), and click **Sync Now**.

## Native macOS Window

**Open Hotkeys Map** launches a lightweight native macOS `WKWebView` window built via Raycast's official Swift package integration (`swift/HotkeysViewer`), with single-instance focus, remembered window position/size, native Print/PDF, native Save dialogs for JSON/SVG exports, and native macOS menu bar & system shortcut scanning.

## Accessibility Permission

Scanning a running app's menu bar shortcuts (**+ Add App → Scan Menu Bar**) uses macOS Accessibility APIs. When prompted, grant Accessibility access to **Raycast** under **System Settings → Privacy & Security → Accessibility**, then click **Scan Menu Bar** again. All other features work without Accessibility permission.
