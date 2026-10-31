# PathSeek: First-time Setup

PathSeek searches files on your own Mac using a manually built index. It requires two open-source command-line tools: [fd](https://github.com/sharkdp/fd) for indexing and [fzf](https://github.com/junegunn/fzf) for searching. The extension **never downloads tools or scans your files in the background**.

## 1. Install the tools

If [Homebrew](https://brew.sh/) is already installed, run this in Terminal:

```bash
brew install fd fzf
command -v fd
command -v fzf
```

Both `command -v` lines should print an executable path. If `brew` is not available, follow the official installation instructions at [brew.sh](https://brew.sh/) first.

If the extension can't locate an installed tool, check its **fd Executable** or **fzf Executable** preference and enter the absolute path returned by `command -v`. In **Search Files and Folders**, a missing `fzf` is explained with a copyable install command; **Build Index** offers the same help if `fd` is missing.

## 2. Create your index (once, manually)

In Raycast, open **Build Index**, choose one or more folders, then submit **Choose Folders and Build Index**. PathSeek invokes `fd` **only after you submit this action**. Choosing or changing folders by itself does not scan; after changing folders later, use **Rebuild Index Now**.

Open **View Index Status** to see the number of indexed paths and the last build time. New/renamed/deleted files appear in the index only after you choose to rebuild it manually.

## 3. Search or select files

- **Search Files and Folders**: Type part of a name or path; press Return to open the selection with its default app. Additional actions include Finder, Quick Look and Copy Path.
- **Find in Open/Save**: In Raycast, assign a command hotkey (suggested `⌘⇧F`, if available). Open another application's file chooser, use the hotkey, search, and press Return to paste the absolute path into the original dialog. On the tested Mac this highlights the chosen file or navigates to the chosen folder. You still confirm Open/Save yourself.

Some third-party file pickers may not accept pasted paths directly. In those cases, press `⌘⇧G` in the original picker first to show macOS' Go to Folder field, then use PathSeek.

The global hotkey must be set manually in Raycast; it cannot be silently registered by the extension.

## Privacy

The index includes filenames and absolute local paths. It remains inside Raycast's support directory. Do not upload the raw index to a public issue. **View Diagnostics** can copy a sanitized troubleshooting report.

For source setup, see [README](../README.md). For Open/Save details, see [Open/Save guide](open-save-dialog.md).
