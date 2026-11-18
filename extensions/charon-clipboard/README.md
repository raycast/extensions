# Charon Clipboard

A [Clipy](https://github.com/Clipy/Clipy)-style clipboard manager for Raycast. Press a hotkey and a native menu pops up **right at your mouse cursor** with your clipboard history in numbered folders (`1 - 10`, `11 - 20`, `21 - 30`) and your snippet folders. Pick an item with the mouse or a number key and it's pasted into the app you were using.

Charon is named after Pluto's largest moon — and the ferryman who carries things across.

## Getting Started

1. Press the hotkey for **Show Clipboard Menu** (or run it once from Raycast). The first time, the **Clipboard Helper** screen opens — press **Enter** to enable it.
2. Assign hotkeys in Raycast Settings → Extensions → Charon Clipboard:

   | Command | Clipy's hotkey |
   | --- | --- |
   | Show Clipboard Menu | `⌘` `⇧` `V` |
   | Show History Menu | `⌃` `⌘` `V` |
   | Show Snippet Menu | `⌘` `⇧` `B` |

   If Clipy or Raycast's Clipboard History already uses one of these hotkeys, free it first.

3. Coming from Clipy? In Clipy choose **Edit Snippets → Export**, then open **Edit Snippets** here and press `⌘` `⇧` `I`.

## Features

Everything works like Clipy:

- History menu with numbered folders, inline items, `1`–`9` / `0` key equivalents, and title truncation
- Tooltips, image thumbnails, and color swatches for `#RRGGBB`
- Stores text, rich text (HTML/RTF), images, and files — each can be turned off
- Hold `⌘` while choosing to paste as plain text, `⌥` to delete the item, `⌃` to paste and delete
- Snippet folders you can reorder and hide, with Clipy XML import and export
- Menu bar menu, Clear History with confirmation, excluded apps, duplicate removal, and "move pasted item to top"
- Items that password managers mark as concealed or transient are never recorded

## The Clipboard Helper

Raycast extensions can't watch the clipboard or open a menu at the mouse cursor, so Charon uses a small helper. It is **opt-in**: nothing is installed until you enable it on the Clipboard Helper screen.

- The helper is a plain JavaScript file run by macOS's built-in `/usr/bin/osascript` (JavaScript for Automation). No binaries are bundled or downloaded. Source: [`assets/helper.js`](assets/helper.js).
- It starts at login via `~/Library/LaunchAgents/com.raycast.charon-clipboard.helper.plist` and is restarted if it exits.
- It checks `NSPasteboard.changeCount` every 50 ms and only reads the pasteboard when it changes.
- Your history is stored only in this extension's support folder. Nothing leaves your Mac.
- The `⌘V` keystroke is sent from a process started by Raycast, so it uses the Accessibility permission Raycast already has.

Disable it on the same screen to stop it and remove the login item. macOS may show a "Background Items Added" notification mentioning `osascript` when you enable it.

## Troubleshooting

```bash
D=~/Library/Application\ Support/com.raycast.macos/extensions/charon-clipboard
launchctl print gui/$(id -u)/com.raycast.charon-clipboard.helper | grep state
osascript -l JavaScript "$D/helper.js" "$D" selftest
```

The self-test prints one OK/FAIL line per macOS API the helper uses. Logs are `helper.log` and `helper.stderr.log` in the same folder.
