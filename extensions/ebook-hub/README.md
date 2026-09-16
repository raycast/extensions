# Ebook Hub

Read, import, and share freely licensed ebooks inside Raycast — distraction-free,
Vim-friendly, and themed with the [Hue](https://github.com/crafts69guy/hue-theme)
moods.

## Commands

| Command | What it does |
| --- | --- |
| **My Library** | Browse local books, filter by language, category, or visibility, and read |
| **Continue Reading** | Reopen the last book at the saved position |
| **Import Book** | Import `.md`, `.txt`, `.epub`, or `.pdf` (prefills the Finder selection) |
| **Browse Community Library** | Add freely licensed books from the community repository |

## Reader Keys

Raycast shortcuts need a modifier, so Vim motions use `ctrl`
([ADR-0003](docs/adr/0003-vim-keybindings.md)).

| Keys | Action |
| --- | --- |
| `Enter` / `ctrl+j` | Next page |
| `cmd+Enter` / `ctrl+k` | Previous page |
| `ctrl+d` / `ctrl+u` | Forward / back 5 pages |
| `ctrl+l` / `ctrl+h` | Next / previous chapter |
| `ctrl+o` | Jump back |
| `ctrl+m` | Toggle bookmark |
| `ctrl+;` | Command Mode |
| `ctrl+/` | Search in book |

Command Mode accepts `:12` (page), `:c3` (chapter), `:toc`, `:bm`,
`:theme mua|huong|cung`, and `/query` (diacritics are ignored).

## Themes

Raycast renders reader text with the active Raycast theme. Ebook Hub uses Hue
colors for accents and offers **Apply Hue Theme to Raycast**, which imports
Huế Mưa, Huế Hương, or Huế Cung as a Raycast theme
([ADR-0001](docs/adr/0001-reading-surface-theming.md)).

## Privacy and Sharing

Books are stored under Raycast's support folder and are **private by default**
([ADR-0004](docs/adr/0004-local-first-library-storage.md)). The community
library only accepts public-domain and Creative Commons books
([ADR-0005](docs/adr/0005-community-library-repository.md)).

## Development

Requires Node.js 24 LTS (see `.nvmrc`).

```fish
npm install
npm run dev            # ray develop
npm test               # vitest
npm run test:coverage  # fails below 95% statements, branches, functions, or lines
npm run typecheck
npm run lint
npm run build
```

## Releasing

Versions are git tags; the changelog is generated from `feat`, `fix`, and `perf`
commits ([ADR-0009](docs/adr/0009-release-versioning-and-changelog.md)).

```fish
npm run release -- --dry-run                   # preview the next entry
npm run release                                # update CHANGELOG.md, commit, and tag
npm run release -- --title "Search Improvements"
npm run publish                                # open the Raycast Store pull request
```

Views are tested against Raycast API doubles in `src/test/`
([ADR-0008](docs/adr/0008-testing-strategy-and-toolchain.md)).
Community books come from
[`crafts69guy/ebook-hub-library`](https://github.com/crafts69guy/ebook-hub-library).

- Domain language: [`CONTEXT.md`](CONTEXT.md)
- Decisions: [`docs/adr/`](docs/adr/README.md)
