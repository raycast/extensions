# Charon Clipboard

A [Clipy](https://github.com/Clipy/Clipy)-style clipboard manager for Raycast. Press a hotkey and a native menu pops up **right at your mouse cursor** with your clipboard history in numbered folders (`1 - 10`, `11 - 20`, `21 - 30`) and your snippet folders. Pick an item with the mouse or the number keys and it is pasted into the app you were using.

Charon is named after Pluto's largest moon — and the ferryman who carries things across.

## Features

- **Popup menu at the cursor** (native `NSMenu`): main menu, history-only menu, snippet-only menu, and per-folder menus
- **Numbered history folders** with 1–9 and 0 key equivalents, inline items, configurable folder size and title length
- **Tooltips, image thumbnails and color swatches** for `#RRGGBB` items
- **Stores text, rich text (HTML/RTF), images and files** — each type can be turned off
- **Modifier actions** while choosing an item: `⌘` pastes as plain text, `⌥` deletes the item, `⌃` pastes and deletes
- **Snippet folders** you can reorder, hide, edit, and save from history
- **Clipy XML import and export**, so you can move your Clipy snippets over (and back)
- **Menu bar menu** with the same structure (hold `⌥` to delete items)
- **Search Clipboard and Snippets**: a Raycast list with full-text search and previews
- Excluded apps, duplicate removal, "move pasted item to top", and clear-history confirmation
- Items that password managers mark as concealed or transient are never recorded

## Setup

1. Run **Enable Clipboard Helper** and press Enter to enable it (see below for what it installs).
2. Assign hotkeys in Raycast Settings → Extensions → Charon Clipboard. Clipy's defaults are:

   | Command | Suggested hotkey |
   | --- | --- |
   | Show Clipboard Menu | `⌘` `⇧` `V` |
   | Show History Menu | `⌃` `⌘` `V` |
   | Show Snippet Menu | `⌘` `⇧` `B` |

   If Clipy or Raycast's own Clipboard History already uses one of these hotkeys, free it first.

3. Coming from Clipy? In Clipy choose **Edit Snippets → Export**, then run **Import and Export Snippets** and pick the exported XML file.

### Per-folder hotkeys

Create a Raycast Quicklink with the link below (replace `My Folder`) and give the Quicklink a hotkey:

```
raycast://extensions/tomoyasaito/charon-clipboard/popup-folder?arguments=%7B%22folder%22%3A%22My%20Folder%22%7D
```

## The Clipboard Helper

Raycast extensions cannot watch the clipboard continuously or draw a menu at the mouse cursor, so Charon uses a small helper. It is **opt-in**: nothing is installed until you run **Enable Clipboard Helper**.

- The helper is a plain JavaScript file run by macOS's built-in `/usr/bin/osascript` (JavaScript for Automation). No binaries are bundled or downloaded. Source: [`assets/helper.js`](assets/helper.js).
- It is registered as a login item at `~/Library/LaunchAgents/com.raycast.charon-clipboard.helper.plist` so it starts when you log in and restarts if it exits.
- It checks `NSPasteboard.changeCount` every 50 ms and only reads the pasteboard when it changes.
- Your history is stored only in this extension's support folder. Nothing leaves your Mac.
- The `⌘V` keystroke that pastes an item is sent from a process started by Raycast, so it uses the Accessibility permission Raycast already has.

Run **Disable Clipboard Helper** to stop it and remove the login item.

macOS may show a "Background Items Added" notification mentioning `osascript` when you enable the helper. That is expected.

## Troubleshooting

- Check the helper: `launchctl print gui/$(id -u)/com.raycast.charon-clipboard.helper | grep state`
- Self-test (prints one OK/FAIL line per macOS API used):

  ```bash
  D=~/Library/Application\ Support/com.raycast.macos/extensions/charon-clipboard
  osascript -l JavaScript "$D/helper.js" "$D" selftest
  ```

- Logs are in the same folder: `helper.log` and `helper.stderr.log`.
- If the helper does not respond, the popup commands open **Search Clipboard and Snippets** instead.
