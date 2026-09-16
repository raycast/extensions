# Ebook Hub — Domain Context

Ebook Hub is a Raycast extension for reading books inside Raycast, importing
your own books, and sharing freely licensed books with the community through a
GitHub-hosted library.

Architecture decisions live in [`docs/adr/`](docs/adr/README.md).

## Glossary

- **Book** — a set of Markdown chapters plus a `manifest.json` describing
  title, authors, language, categories, license, and visibility.
- **Library** — the books stored on this machine under Raycast's
  `environment.supportPath`. Local-first; nothing leaves the machine unless the
  user shares it.
- **Community Library** — a separate GitHub repository of freely licensed books
  with a CI-generated `index.json`. Contributions arrive as pull requests.
- **Visibility** — `private` (default, never uploaded) or `shared` (published
  to, or downloaded from, the Community Library).
- **Importer** — converts a source file (`.md`, `.txt`, `.epub`, `.pdf`) into
  Markdown chapters. Importers never execute or embed remote content.
- **Chapter** — one Markdown file. Chapters are the unit that is loaded into
  memory.
- **Block** — a paragraph-level unit of a chapter (paragraph, heading, list,
  fenced code block). Blocks are the stable anchor for reading positions.
- **Page** — a run of consecutive blocks that fits on one Raycast `Detail`
  screen, sized by the *words per page* preference. Pages are derived, never
  stored.
- **Reading Position** — `{ chapterIndex, blockIndex }`. Survives changes to
  the page size because it points at a block, not a page.
- **Bookmark** — a saved Reading Position with a short excerpt.
- **Jumplist** — in-session history of positions before large jumps, walked
  back with `ctrl+o`.
- **Command Mode** — a `List` whose search bar acts as a Vim-style command line
  (`:12`, `:c3`, `:toc`, `:bm`, `:theme mua`, `/query`).
- **Mood** — one of the three Hue themes: Huế Mưa (dark), Huế Hương (dark),
  Huế Cung (light).
