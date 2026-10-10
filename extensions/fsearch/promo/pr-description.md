## Description

FSearch is instant, typo-tolerant search of every file on your Mac, powered by [fsearch](https://github.com/noahdunnagan/fsearch), a fast local file indexer with a daemon.

- **Search Files**: fuzzy filename search across the whole disk (about a millisecond per query), plus indexed content search (`grep:`, `regex:`, `sym:`) and filters (`ext:`, `type:`, `in:`, `mtime:`, `size:`).
- **Preview pane**: images, text and code (opened at the first matching line), Word, RTF, OpenDocument, archive listings, property lists, and Quick Look thumbnails of PDFs, Office files, video and fonts, with Spotlight metadata.
- **Home screen**: saved searches (which can become Quicklinks), quick searches, and places.
- **Actions**: open, reveal, Quick Look, copy or paste the file, its name, or its path, and Move to Trash, using Raycast's standard shortcuts.
- **AI tool**: a **Search Files** tool for Raycast AI that uses the same query syntax.

**External dependency.** fsearch has no prebuilt binaries yet, so it is built from source with `cargo install --git https://github.com/noahdunnagan/fsearch`. When it is missing, the home screen offers **Install FSearch in Terminal**, which runs that command in a visible Terminal window, installing Rust with rustup first if needed. Nothing is downloaded or run in the background. The extension finds the binary in `~/.local/bin`, `~/.cargo/bin`, or Homebrew's bin folders, or at a path set in preferences.

**Privacy.** Everything runs locally. The extension talks to the fsearch daemon over its Unix socket, and previews use tools that ship with macOS (`qlmanage`, `textutil`, `unzip`, `tar`, `plutil`, `mdls`).

## Screencast

<!-- drag promo/fsearch-promo-small.mp4 here -->

## Checklist

- [x] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [x] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [x] I ran `npm run build` and [tested this distribution build in Raycast](https://developers.raycast.com/basics/prepare-an-extension-for-store#metadata-and-configuration)
- [x] I checked that files in the `assets` folder are used by the extension itself
- [x] I checked that assets used by the `README` are placed outside of the `metadata` folder
