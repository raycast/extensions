<p align="center">
  <img src="assets/icon.png" width="96" height="96" alt="Raynotes icon">
</p>

<h1 align="center">Raynotes</h1>

<p align="center">Fast, local-first markdown notes from Raycast.</p>

<p align="center">
  <a href="https://github.com/efekurucay/raynotes/actions/workflows/ci.yml"><img src="https://github.com/efekurucay/raynotes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

Raynotes keeps ordinary `.md` files in a folder you own — `~/notes` by
default. There is no note cap, proprietary database, background sync, or hidden
index. Any editor or agent can read and write the same files directly.

## Commands

| Command        | What it does                                                           |
| -------------- | ---------------------------------------------------------------------- |
| **Quick Note** | Appends `- HH:MM <text>` to today's daily note without opening a view. |
| **New Note**   | Opens a blank editor for a standalone note.                            |
| **Notes**      | Browses, searches, previews, edits, opens, reveals, and deletes notes. |

In the Notes list, `Enter` edits, `⌘N` creates, `⌘O` opens in the default
markdown app, `⇧⌘F` reveals in Finder, `⇧⌘,` copies the path, and `⌘⌫` moves a
note to the Trash.

The editor uses its first non-empty line as the title and autosaves after 500
ms. `Enter` saves and closes; `⇧Enter` inserts a line break.

## Setup

After installing Raynotes, configure **Notes Folder** and optional command
hotkeys under **Raycast Settings → Extensions → Raynotes**. The folder defaults
to `~/notes` and is created automatically on first use.

## Storage

```text
~/notes/
├── daily/
│   └── 2026-07-29.md
├── raycast-extension-idea.md
└── work/
    └── standup.md
```

Every read walks the folder fresh. Rename files, move them into folders, edit
them from Obsidian or Vim, or hand the folder to an AI agent; there is no second
copy to reconcile. Raynotes chooses a filename once and never renames it, so
paths stay stable even if a note's title changes.

## Development

Requires Node.js 22 or newer.

```bash
git clone https://github.com/efekurucay/raynotes.git
cd raynotes
npm ci
npm run check   # tests, types, lint, formatting, and production build
npm run dev     # install into Raycast and hot-reload
```

Filesystem behavior is covered by the dependency-free checks in
[`scripts/verify.ts`](scripts/verify.ts). The architecture and product decisions
are documented in the
[design spec](docs/superpowers/specs/2026-07-29-raynotes-design.md).

`npm run lint:raycast` additionally runs Raycast Store metadata validation.

## License

[MIT](LICENSE)
