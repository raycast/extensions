# PathSeek

**English** | [简体中文](README.zh-CN.md)

**PathSeek** is a fast file and folder search extension for Raycast on macOS. Inspired by [Listary](https://www.listary.com/) and developed from the MIT-licensed Raycast [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search) extension, it adds a quick way to **locate files and folders directly in an existing application's Open / Save dialog**.

## Features

- **Fast search:** Build a persistent local index with `fd` when you choose, then search filenames, folders, and paths using `fzf`.
- **File actions:** Open files, reveal them in Finder, use Quick Look, and copy paths.
- **Open / Save navigation:** Find a file or folder and paste its absolute path back into the original file dialog. PathSeek never presses Open or Save for you.
- **Manual indexing:** Choose the folders to index. Installation, search, and startup never trigger automatic indexing.

## Install and use

For step-by-step first-time setup and troubleshooting, see the [setup guide](docs/first-time-setup.md).

Requires [Raycast](https://www.raycast.com/), [fd](https://github.com/sharkdp/fd), and [fzf](https://github.com/junegunn/fzf):

```bash
brew install fd fzf
git clone https://github.com/juezhong/raycast-pathseek.git
cd raycast-pathseek
npm ci
npm run dev
```

In Raycast, run **Build Index** to choose folders and build your index manually. Use **Search Files and Folders** to find and open items; press `⌘K` for additional actions.

For another app's file picker, assign a global hotkey to **Find in Open/Save** (suggested: `⌘⇧F`, if available). Open the app's file dialog, press the hotkey, search, and press **Return**. On the tested macOS dialog, no preliminary `⌘⇧G` is needed; in apps that handle pasted paths differently, try `⌘⇧G` first. See the [Open / Save guide](docs/open-save-dialog.md).

## Credits and license

PathSeek draws on the workflow of [Listary](https://www.listary.com/) and extends the MIT-licensed Raycast [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search) extension (original author `erykksc`; contributor `gilitos92`). Thanks to the upstream contributors. Upstream copyright, the MIT license notice, and dependency attributions are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

PathSeek is released under the [MIT License](LICENSE). Local development installation is available; **Raycast Store publication is still pending**.
