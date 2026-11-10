# Hyperduck History

Raycast command that lists the links sent to this Mac with [Hyperduck](https://sindresorhus.com/hyperduck).

## How it works

Hyperduck for Mac keeps its link history in its shared preferences file:

```
~/Library/Group Containers/group.com.sindresorhus.Hyperduck.shared/Library/Preferences/group.com.sindresorhus.Hyperduck.shared.plist
```

The command reads the `history` and `isHistoryEnabled` keys with `plutil`. It does not use the network and it never writes to Hyperduck's files.

Hyperduck keeps only its most recent links (30 in the history checked on 2026-11-10). The extension copies each link into Raycast local storage when the command opens, so older links stay searchable after Hyperduck drops them. Those links show a tray icon.

## Requirements

- Hyperduck for Mac with history turned on (Hyperduck settings).
- macOS can ask whether Raycast may access data from other apps. Allow it, or the command shows "Could not read Hyperduck history".

## Actions

| Action | Shortcut |
| --- | --- |
| Open in browser | ↵ |
| Copy URL | ⌘C |
| Paste URL | ⌘⇧V |
| Open with… | ⌘O |
| Remove from list | ⌃X |
| Clear list | ⌃⇧X |

Remove and Clear change only this extension's list. Hyperduck's own history does not change.

## Development

```bash
npm install
npm test        # unit tests (node:test)
npm run lint
npm run dev     # load into Raycast
swift scripts/make-icon.swift /tmp/icon.png && sips -z 512 512 /tmp/icon.png --out assets/hyperduck-history-icon-simple.png   # redraw the icon
```
