# Hyperduck History

Raycast command that lists the links sent to this Mac with [Hyperduck](https://sindresorhus.com/hyperduck).

## How it works

Hyperduck for Mac keeps its link history in its shared preferences file:

```
~/Library/Group Containers/group.com.sindresorhus.Hyperduck.shared/Library/Preferences/group.com.sindresorhus.Hyperduck.shared.plist
```

The command reads the `history` and `isHistoryEnabled` keys with `plutil`, on this Mac. It never writes to Hyperduck's files. The only network use is the site icon of each link: Raycast gets it from your favicon provider (Raycast settings), which receives the site's domain.

Hyperduck keeps only its most recent links (30 in the history checked on 2026-11-10). The extension copies each link into Raycast local storage when the command opens, so older links stay searchable after Hyperduck drops them. Those links show a tray icon.

## Requirements

- Hyperduck for Mac with history turned on (Hyperduck settings).
- macOS can ask whether Raycast may access data from other apps. Allow it, or the command shows "Could not read Hyperduck history".

## Actions

| Action           | Shortcut |
| ---------------- | -------- |
| Open in browser  | ↵        |
| Copy URL         | ⌘↵       |
| Paste URL        | ⌘⇧V      |
| Open with…       | ⌘O       |
| Remove from list | ⌃X       |
| Clear list       | ⌃⇧X      |

Remove and Clear ask before they change anything. They change only this extension's list, not Hyperduck's own history. A removed link that Hyperduck no longer has cannot come back.
