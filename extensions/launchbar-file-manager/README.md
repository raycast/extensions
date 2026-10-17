# LaunchBar File Manager for Raycast

Browse, preview, and organize your files without leaving the keyboard — LaunchBar-style file management inside Raycast.

There are two commands: **Browse Files** (the file browser) and **Transfer Finder Selection** (send files selected in Finder straight to a destination).

Tip: give **Browse Files** a short alias like `fm` and pin it (open Raycast, find the command, `⌘K` → Configure Command) so it's always one keystroke away.

## Browsing your files

Open **Browse Files**. You start in your starting folder (changeable in settings, see below).

- **Move around:** `→` or `Enter` goes into a folder. `←` (or `⌘[`) goes up one folder — and lands the highlight on the folder you just came from, so you never lose your place. `Esc` closes the browser.
- **Find things:** just start typing to filter the current folder — matching is fuzzy, so abbreviations (`vsc` finds Visual Studio Code) and small typos (`documnets` finds Documents) still match. The search bar always shows live counts, e.g. `128 items · 2 selected`.
- **Open and preview:** `Space` opens a highlighted folder, or previews a highlighted file with Quick Look. The preview follows as you move up and down the list. `Enter` opens files in their default app. **Open With…** (any file or folder) browses `/Applications` for the app you want — type to fuzzy-find it, `Enter` opens your file with it, `←`/`→` step through subfolders like Utilities.
- **Jump around:** every row has Go actions for Home, Desktop, Documents, Downloads, Applications, and `/`. `⌘.` toggles hidden files, `⌘I` toggles the details pane (size, dates, path).

The list never jumps around while you arrow through it: it stays put until the highlight reaches the edge, then scrolls to reveal more.

## Selecting multiple files

- Press `X` on any row to select or deselect it. Selected rows get a checkmark and a green `Selected` tag, and the count in the search bar updates.
- `⌘⇧A` selects everything in the folder, `⌘⇧F` selects just the filtered results, `⌘⇧X` clears the whole selection.
- With files selected, any row's action menu (`⌘K`) offers batch operations: trash them all, compress them into one ZIP here, or copy all their paths.
- Selections are temporary: exiting the browser, completing a transfer, or cancelling one always deselects everything.

## Moving and copying files (the Tab flow)

There is exactly one way to move or copy — it works the same for one file and for many:

1. **Pick what to move.** One file? Just highlight it, nothing else needed. Several? Press `X` on each until you're happy.
2. **Press `Tab`.** A transfer tree opens, starting at your home folder (or the current folder — see settings).
3. **Browse to the destination** with `←` / `→`. Need a folder that doesn't exist yet? Press `⌘N` to create it — you'll land straight inside it.
4. **Press `Enter`.** On a highlighted folder, this targets *that* folder; on a file row, it targets the folder you're viewing.
5. **Choose Copy or Move.** A progress bar tracks large transfers. Afterwards, the destination folder opens so you can see the results.

To back out at any point, press `Esc` (or Cancel Transfer): it deselects everything and returns you to the browser.

Safety nets: you can't copy a folder into itself, and moving files onto the folder they're already in is refused with a message instead of creating duplicates. Name clashes get a `copy` suffix — nothing is ever overwritten.

## Transferring straight from Finder

Select files or folders in Finder, then run **Transfer Finder Selection**. It skips the browser and drops you directly into the transfer tree with your Finder selection loaded — same `Enter`-to-target, Copy-or-Move flow. This never touches files you selected with `X` in the browser. If Finder has nothing selected, you'll get a Retry option.

## Other file operations

Available on any file or folder via `⌘K`:

- **Rename** (dialog with the current name prefilled), **Duplicate**
- **Compress to ZIP** (`⌘⇧Z`) — single items and whole selections; archives open exactly like Finder's
- **Extract Here** — appears on `.zip` files
- **Move to Trash** (`⌘⌫`, with confirmation) — uses a fallback chain so odd filenames and unusual volumes don't fail silently
- **New Folder / New File**, **Copy Path**, **Copy File Name**, **Show in Finder**

## Settings

Raycast Settings → Extensions → LaunchBar File Manager:

| Setting | What it does |
|---|---|
| Starting folder | Where Browse Files opens (default: your home folder) |
| On open | Begin in the starting folder, or resume the last opened folder |
| Transfer start folder | Where the `Tab` transfer tree begins: home folder or current folder |
| Show hidden files | Show dotfiles by default (you can still toggle per session) |

If folders show up empty, grant Raycast Full Disk Access: System Settings → Privacy & Security → Full Disk Access → enable Raycast.

One keyboard note: `Space`, `X`, and the arrow keys are deliberately bound to list actions LaunchBar-style. That means while the action menu (`⌘K`) is open, typing a space in its *Search for actions* field will trigger the row's action instead — press `Esc` to close the menu first, then carry on.

## For developers

```bash
npm install
npm run dev     # then Raycast → Import Extension → select this folder
```

```bash
npm run lint    # must be clean before publishing
npm run build   # validates a distribution build
npm run publish # opens the Store pull request (see steps below)
```

GitHub workflow: see `GITHUB_STEPS.md`. Publishing checklist (author handle, categories, screenshots, review): run `npm run build` and `npm run lint` locally, capture at least three 2000×1250 screenshots via Raycast's Window Capture with *Save to Metadata*, then `npm run publish` and follow the pull-request review in `raycast/extensions`.
