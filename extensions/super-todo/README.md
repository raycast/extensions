# super todo

A quiet todo list with a floating companion for your Mac. Complete, undo, and reorder with the same keys in Raycast and the companion. Unfinished todos stay for tomorrow.

## Required companion app

This extension requires the open-source **super todo** Mac app. It uses the app's local CLI to share a single SQLite database with the floating window. The companion UI does not need to be running for the Raycast list to work.

1. Read the [preview release notes](https://github.com/myksyut/super-todo/releases).
2. Download the Universal ZIP and `SHA256SUMS`. Requires macOS 14 or later; Apple Silicon and Intel slices are included. Intel hardware has not been tested.
3. Verify the archive with `shasum -a 256 -c SHA256SUMS`, extract it, and move **super todo.app** to `/Applications` or `~/Applications`.
4. Open it once. If you use a different folder, select the app in the extension's **Companion App** preference.

**The preview is not Developer ID signed or notarized.** It has a local ad-hoc signature only. Gatekeeper or organizational policy may block opening it. Review [Apple's safety guidance](https://support.apple.com/en-us/102445) and the [source/build instructions](https://github.com/myksyut/super-todo#build-from-source) before deciding whether to trust it. Do not disable Gatekeeper globally. A source build is an alternative; a notarized release is not currently available.

The extension never silently downloads or installs executables. The companion source and build scripts are public; no opaque helper binary is bundled with this extension.

## Commands

- **Show Todos** — add, complete, edit, and reorder.
- **Open Floating List** — keep your list in a pinnable window above your work.

## Shared keys

| Action | Shortcut |
| --- | --- |
| Select | ↑ / ↓ |
| Complete selected todo | Enter |
| Add mode | ⌘N |
| Edit | ⌘E |
| Move up / down | ⌘⇧↑ / ⌘⇧↓ |
| Undo latest completion | ⌘⇧Z |
| Add / save in input mode | Enter |
| Return to the list | Esc |

Adding stays in input mode for consecutive entries. Saving an edit returns to the list. Raycast also provides a quick-add row for search text, ⌘O to open the companion, and ⌘R to refresh. Reordering is disabled while search results are filtered.

## Privacy and storage

All todo content stays on your Mac. No accounts, analytics, or cloud sync. The database is stored at `~/Library/Application Support/Today/todos.sqlite`; this legacy folder intentionally preserves existing local Today data after the rename. No data is included in the app download, so new users start empty.

On add/edit, titles are trimmed and whitespace runs become one space, with a 500-character limit. User text is not translated, and saved data is not rewritten on upgrade.

The companion refreshes about once a second; the Raycast list about every 1.5 seconds while mounted. Completed todos remain recoverable; there is no permanent-delete or history browser in this preview.

[Source code and issue tracker](https://github.com/myksyut/super-todo).
