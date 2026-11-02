# PathSeek

**English** | [简体中文](README.zh-CN.md)

**PathSeek** brings Listary-style assisted path pasting to macOS Open/Save dialogs. With a user-configured Raycast hotkey, find a file or folder and paste its absolute path back into the original dialog. A persistent local index, built only when you choose, powers the search.

[Open / Save workflow and compatibility guide](docs/open-save-dialog.md)

## Features

- **Open / Save navigation:** Launch **Find in Open/Save** with your assigned hotkey, search, and paste a selected file or folder path into the original dialog using Raycast's `Action.Paste`. Some apps require opening **Go to Folder** with `⌘⇧G` first. PathSeek never presses Open or Save for you.
- **Manual indexing:** Choose which folders to index and explicitly build or rebuild the persistent index with `fd`. Installation, opening Raycast, and searching never trigger a file scan.
- **Search in Raycast:** Search indexed filenames, folders, and paths with `fzf`. Open results, reveal them in Finder, use Quick Look, or copy absolute paths.

## Install and use

Requires [Raycast](https://www.raycast.com/), [fd](https://github.com/sharkdp/fd), and [fzf](https://github.com/junegunn/fzf). Install the command-line tools separately:

```bash
brew install fd fzf
```

1. In Raycast, run **Build Index**, select the folders to search, and explicitly build the index.
2. Assign a global hotkey to **Find in Open/Save** using Raycast's command configuration (suggested: `⌘⇧F`, if available). PathSeek cannot assign this hotkey automatically.
3. Open a macOS Open/Save dialog in another application, press the hotkey, find a file or folder, and press **Return** to paste its full path back into that application. In apps where direct pasting does not work, first press `⌘⇧G` in the original dialog and try again.

Use **Search Indexed Files** for regular file and folder searching outside Open/Save dialogs. For detailed setup and troubleshooting, see the [first-time setup guide](docs/first-time-setup.md) and [Open / Save guide](docs/open-save-dialog.md).

## Credits and license

PathSeek draws on the workflow of [Listary](https://www.listary.com/) and extends the MIT-licensed Raycast [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search) extension (original author `erykksc`; contributor `gilitos92`). Thanks to the upstream contributors. Upstream copyright, the MIT license notice, and dependency attributions are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

PathSeek is released under the [MIT License](LICENSE).
