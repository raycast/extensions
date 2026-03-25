# Find in Chrome

Search across your Chrome tabs, bookmarks, and history in one unified list. Switch to existing tabs instantly—no more duplicate tabs.

## Features

- **Unified Search** — One command to search tabs, bookmarks, and history simultaneously
- **Smart Tab Switching** — Select an open tab to switch to it instead of opening a duplicate
- **Automatic Profile Detection** — Works with your active Chrome profile automatically
- **Visual Identification** — Favicons and colored tags help you quickly identify results
- **Real-time Filtering** — Results filter instantly as you type

## Installation

1. Install from the [Raycast Store](https://raycast.com/albert_dabinski/chrome-find) or clone this repository
2. If installing manually: run `npm install && npm run dev`

## Requirements

- macOS 12 (Monterey) or later
- [Raycast](https://raycast.com) installed
- Google Chrome installed

## Permissions

On first launch, macOS will request permissions. Grant the following:

| Permission | Location | Purpose |
|------------|----------|---------|
| Automation | System Settings → Privacy → Automation → Raycast → Google Chrome | Allows tab switching |
| Accessibility | System Settings → Privacy → Accessibility → Raycast | Enables window control |

Additionally, enable in Chrome:
- **Chrome → View → Developer → Allow JavaScript from Apple Events**

## Usage

1. Open Raycast and type **"Find in Chrome"**
2. Browse or search across all your Chrome data
3. Press **Enter** to:
   - **Tab** → Switch to it (brings window to front)
   - **Bookmark/History** → Open in Chrome

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Switch to tab / Open URL |
| `⌘ + C` | Copy URL to clipboard |
| `⌘ + R` | Refresh data |

### Result Types

Results are tagged by source:
- 🟢 **Tab** — Currently open in Chrome
- 🔵 **Bookmark** — Saved in your bookmarks
- 🟠 **History** — From browsing history

## Troubleshooting

### "No tabs found"
Ensure Chrome has JavaScript from Apple Events enabled:
Chrome → View → Developer → ✅ Allow JavaScript from Apple Events

### History not loading
Chrome locks its History database while running. The extension copies it to a temp file, but if issues persist, try restarting Chrome.

### Bookmarks not showing
The extension reads from your active Chrome profile. If you use multiple profiles, ensure the correct one is active in Chrome.

### Permission denied errors
1. Open System Settings → Privacy & Security → Automation
2. Ensure Raycast has permission to control Google Chrome
3. You may need to remove and re-add the permission if it was previously denied

## License

MIT
