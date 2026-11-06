# Fleeting Notes

A single editable scratchpad inside Raycast. Open it, type, close it, and resume the same text later. No title, account, save form, or note list is required.

## What's new

- **Add to Scratchpad** — append a line straight from the Raycast search bar.
- **Append Selected Text to Scratchpad** — capture a selection from any app.
- Live word and character count.

## Commands

- **Open Scratchpad**: Opens the editor with the current local pad focused. Assign a hotkey in Raycast Settings → Extensions → Fleeting Notes → Open Scratchpad. Press the hotkey to reopen; use Escape or Save and Close to dismiss Raycast.
- **Scratchpad Menu Bar**: Optional and disabled by default. Enable it in Raycast Settings to add a pencil menu with Open Scratchpad and Copy Scratchpad.

The editor is Raycast's standard TextArea, not a separate floating window. It supports plain text; optional Markdown highlighting can be enabled in the extension preferences. The public extension API does not offer a supported arbitrary persistent floating editor or a global hotkey-registration API. Hotkeys are assigned by the user in Raycast Settings. The menu-bar command opens the editor; it does not implement a system-wide show/hide toggle.

## Editor actions

| Action | Shortcut | Behavior |
| --- | --- | --- |
| Save and Close | ⌘↩ | Finishes saving and closes Raycast. |
| Copy Scratchpad | ⇧⌘C | Copies the entire current text. |
| Append Clipboard | ⇧⌘V | Adds clipboard text after the current text. Regular ⌘V still pastes at the cursor. |
| Start New Scratchpad | ⌘N | Confirms, keeps the current pad as the previous pad, and clears the editor. |
| Swap with Previous Scratchpad | ⇧⌘P | Restores the previous pad while preserving the current pad in that slot. |
| Show Storage Folder | Action menu | Reveals local data for manual backup. |

Only one previous pad is retained. Starting another new pad replaces that older previous pad after a confirmation. This is a temporary workspace, not a notebook archive. Copy anything you want to keep elsewhere.

## Saving and privacy

Each change synchronously writes a versioned JSON file through a temporary file and atomic rename in Raycast's extension support directory. No delayed save timer or unmount-only save is used. Files have owner-only permissions. A lock and revision check prevent conflicting command workers from silently overwriting each other. If saving fails, the editor retains your text and shows an explicit warning so you can copy it before closing.

The extension makes no network requests and requires no external app or account. It uses the clipboard only when you request a clipboard action. Text remains on this Mac and is not encrypted. Raycast may retain its ordinary view state; this extension does not use Raycast Form Drafts as its data store. Removing the extension or its support folder can remove its saved text.

The current pad is limited to 1 MB of UTF-8 text to keep per-keystroke writes responsive. Existing malformed or unsupported-version data is left untouched. A save lock abandoned by an exited process is recoverable; an incomplete abandoned lock can take 30 seconds to become recoverable. Recovery itself is serialized with a separate coordination gate. If Raycast crashes in that short acquisition phase and leaves `scratchpad.lock.gate`, the extension fails safely instead of risking another writer's data: copy any unsaved text, quit Raycast, remove only that gate file from the storage folder, and reopen.

## Existing options and scope

Raycast already offers [Raycast Notes](https://manual.raycast.com/notes), including a floating window, multiple notes, and a menu-bar toggle. The Store's [Quick Notes source](https://github.com/raycast/extensions/tree/main/extensions/quick-notes) implements a fuller note manager with titles, tags, import/export, and folder synchronization. Both were inspected before this package was built.

Fleeting Notes implements Daniel's narrower requested workflow: a title-free, instantly focused, single local pad inside the command window with per-change persistence and one recoverable previous pad. It is an original implementation, not a clone or integration with the separate Fleeting Notes app.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Official API references

- [Form / TextArea](https://developers.raycast.com/api-reference/user-interface/form)
- [Environment / supportPath](https://developers.raycast.com/api-reference/environment)
- [Menu Bar Commands](https://developers.raycast.com/api-reference/menu-bar-commands)
- [launchCommand](https://developers.raycast.com/api-reference/command)
- [Raycast extension manifest](https://developers.raycast.com/information/manifest)
