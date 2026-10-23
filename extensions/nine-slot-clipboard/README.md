# Nine Slot Clipboard

A Raycast extension that keeps nine clipboard slots. Each slot has its own save command and its own paste command, so you can bind a hotkey to every one.

## Why not Snippets?

Snippets are for text you curate and reuse for weeks. Slots are meant to be overwritten constantly during one task, such as moving several fields between two windows, without each copy replacing the last one on the system clipboard.

- One hotkey (suggested ⌘⌥1, which you assign in Raycast) saves the current selection to slot 1 and replaces what was there. There is no editor, no name to type, and no confirm step. If nothing is selected, it saves the clipboard instead.
- A second hotkey (suggested ⌘⇧1) pastes the slot back into the app you were using.
- Throwaway copies stay out of your Snippets library, and **Manage Clipboard Slots** shows all nine at once so you can paste, replace, or clear them.

## Shortcuts

Raycast hotkeys are one key combination. macOS already uses **⌘C** for Copy, and Raycast cannot listen for a sequence such as “press ⌘C, then press 1”.

These shortcuts do that job in one press. The save command reads the highlighted text itself, so you do not press ⌘C first.

| Slot | Save the selection | Paste the slot |
| ---- | ------------------ | -------------- |
| 1    | ⌘⌥1                | ⌘⇧1            |
| 2    | ⌘⌥2                | ⌘⇧2            |
| 3    | ⌘⌥3                | ⌘⇧3            |
| 4    | ⌘⌥4                | ⌘⇧4            |
| 5    | ⌘⌥5                | ⌘⇧5            |
| 6    | ⌘⌥6                | ⌘⇧6            |
| 7    | ⌘⌥7                | ⌘⇧7            |
| 8    | ⌘⌥8                | ⌘⇧8            |
| 9    | ⌘⌥9                | ⌘⇧9            |

Pick different combinations in Raycast if any of these clash with an app you use.

### Assign them

1. In `package.json`, set `author` to your Raycast username before the first run if you want to publish the extension or pass `npm run lint`. Raycast looks that handle up on the Store. Leaving it as `local` is fine for personal use, but changing it later makes Raycast treat this as a new extension and the saved slots will not carry over.
2. In this folder, run `npm install`, then `npm run dev`. Leave that process running.
3. Open Raycast and search for `Copy to Slot 1`.
4. Press **⌘K**, choose **Configure Command**, then **Set Hotkey**.
5. Press **⌘⌥1** and confirm with Return.
6. Search for `Paste Slot 1` and set **⌘⇧1** the same way.
7. Repeat for slots 2 through 9.

Settings → Shortcuts lists every hotkey in one place.

## What each command does

- **Copy to Slot 1–9** stores text in that slot. By default it reads the text selected in the frontmost app. If nothing is selected, it stores whatever is already on the clipboard.
- **Paste Slot 1–9** inserts that slot into the app you were just using.
- **Manage Clipboard Slots** shows all nine values. From there you can paste, copy, replace, or clear a slot.

Slots are plain text and stay saved after you quit Raycast. Images and files are not stored. Text longer than about one million characters is rejected.

## Preferences

Open Raycast Settings → Extensions → Nine Slot Clipboard.

- **What to save**
  - _Selected text, then clipboard_ (default). One shortcut both copies the highlight and files it in the slot.
  - _Selected text only_. Nothing is saved when the front app has no selection.
  - _Clipboard only_. Press the normal **⌘C** first, then the slot shortcut, when an app does not expose its selection.
- **Also copy saved text to the system clipboard**. On by default, so saving a selection still performs a normal copy.

The first time a copy command reads selected text, macOS may ask you to allow Raycast in System Settings → Privacy & Security → Accessibility.

## Develop

Requires Node.js 22.22 or newer, plus the Raycast app on macOS.

```bash
npm install
npm run dev
```

`npm test` checks the slot rules, and `npm run build` bundles the extension. `npm run lint` also checks that `author` is a real Raycast username.
