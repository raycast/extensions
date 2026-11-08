# JW Library Linker (Raycast)

Search your installed JW Library publications from Raycast and open books,
individual chapters, Bible references, meetings, and text bookmarks.

This is an unofficial community extension. It is not affiliated with or endorsed
by the publishers of JW Library.

## Requirements

- Raycast on macOS.
- [JW Library for Mac](https://apps.apple.com/us/app/jw-library/id672417831?platform=mac),
  which currently requires macOS 13 or later and an Apple M1 chip or later.
- Downloaded JW Library publications for publication and chapter searches.

**Bible reference names and abbreviations are currently German.** Publication
links preserve the language of the installed edition. Meetings and index searches
currently target German content.

## Features

- Open Bible references (example: `1Mo 1:1`, `Römer 8:28`, `1.Chr2:3,4`)
- Open Meetings tab (`m`, `meeting`, `meetings`)
- Search specific index publications (`s keyword`)
- Search and open JW Library bookmarks (`b` or `b keyword`)
- Browse publication chapters by folder symbol (`it_X kingdom`)
- Discover Bible books and publications by typing part of a name
- Open publication results directly in JW Library with Enter; copying their search text remains available

## Open an Individual Chapter

Select a publication result and press **⌘Enter**, or choose **Browse Chapters**
from the action panel (**⌘K**). Select a chapter and press **Enter** to open it in
JW Library.

You can also enter a chapter number or part of its title directly:

- `rr_X`: browse all documents in the book, including its front matter.
- `rr_X 3`: show chapter 3.
- `rr 3`: use the short publication symbol when it matches one installed edition.
- `rr_X anbeten`: search chapter titles.

If several editions share a short symbol, select an edition from the choices
shown, or use its full folder name, such as `rr_X`.

## Setup

1. Install and open JW Library, then download the publications you want to search.
2. Open Raycast and run **Search JW Library**.
3. Leave **JW Library Container UUID** empty to try automatic discovery. If
   discovery fails, open the extension's preferences from its action panel and
   enter the UUID matching:
   `~/Library/Containers/<UUID>/Data/Library/Publications`.

No login or API key is required. The extension uses macOS's bundled
`/usr/bin/sqlite3`; users do not need to install a separate database tool.

## Search Shortcuts

| Input                                   | Result                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| `1Mo 1:1`, `Römer 8:28`, `Psalm 23:1-6` | Open a German Bible reference                                    |
| `m`, `meeting`, `meetings`              | Open today's German meetings                                     |
| `b`, `b keyword`                        | Browse or search text bookmarks                                  |
| Part of a publication's title or symbol | Find installed publications                                      |
| `rr_X 3`                                | Open chapter 3 of the German edition                             |
| `s keyword`                             | Search chapter titles in the supported German index publications |

The `s` shortcut searches installed `rsg19_X`, `nwtstg_X`, `it_X`, and selected
document classes in `nwtsty_X`. It searches titles, not the full publication text.

Select a Bible book or the bookmark shortcut and press **Enter** to fill the
search field. On a publication, **Enter** opens it and **⌘Enter** browses chapters.

## Troubleshooting

- **No publications found:** open JW Library and download a publication first.
  Check the Container UUID preference if automatic discovery fails. Bible and
  meeting links can still be used without a publications directory.
- **Data could not be read:** check macOS permissions for Raycast and verify that
  the selected container belongs to JW Library. Local app data formats may change
  between JW Library versions.
- **Downloads or bookmarks have changed:** press **⌘R** or choose **Refresh
  Library**. This reloads publication metadata and clears cached database results.
- **No chapter matches:** use a chapter number or part of its title. Clear the
  filter after the publication folder name to see all documents.
- **A short symbol is ambiguous:** choose the installed edition offered in the
  results. For ambiguous Bible aliases, enter the full book name shown.
- **A link cannot open:** confirm JW Library is installed and can open normally.
  Use **Copy Link** when reporting a specific navigation problem.

Audio and video bookmarks remain visible with an explanation; opening them is
not supported. Missing, busy, incompatible, and unreadable databases produce
recovery guidance rather than an empty search. Bible validation uses numeric
chapter and verse bounds for the NWT canon; other editions may number verses
differently.

## Privacy

The extension reads publication metadata and text bookmarks from local JW Library
data. SQLite queries run in read-only mode; the extension does not edit
publications, bookmarks, notes, or highlights. It makes no network requests and
includes no analytics. Opening a link hands control to JW Library, which may
download content under its own settings.

Query results are cached in memory with size limits and invalidated when the
database or its write-ahead log changes. The extension does not create a separate
persistent search index.

When reporting an issue, share the command, expected behavior, and app versions.
Do not attach your bookmark database or personal notes. Review screenshots for
personal data before sharing them.

## Development

Use Node.js 22.22.2 or later with Raycast installed on macOS. Publication and
bookmark queries require the macOS `sqlite3` executable and local JW Library data.

```bash
npm ci
npm run dev
```

Run the checks before submitting changes:

```bash
npm run check
npm run lint
npm audit --audit-level=moderate
```

The build writes a distributable extension to `dist/`; development mode installs
the command in Raycast. Linting validates the manifest and icons and needs network
access to Raycast's schema and author API. `npm run check` runs TypeScript,
ESLint with zero warnings, tests, Prettier verification, and the distribution
build. `npm run lint:code` runs ESLint alone; `npm run format` applies formatting.
The local check does not replace Store metadata validation.

The scoped `minimatch@^10` override uses the patched 11.x API for the CLI and
linting dependencies affected by [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
It preserves the separate 5.x dependency used by the template tooling. Remove
the override once those upstream dependencies adopt a patched version.

Tests use Node's built-in test runner and the existing TypeScript compiler to
check reference bounds, publication links, bookmark languages and anchors, and
asynchronous data loading against synthetic SQLite/filesystem fixtures. They
exercise cancellation, timeouts, busy databases, and cache invalidation, including
live write-ahead logs. No personal databases are included. In Raycast, also check
Bible links, `m`, `s keyword`, `b`, and `it_X kingdom`, including missing local data.
Bible and meeting links work without a local publications directory. Database
queries use SQLite read-only mode.

Keep packaged artwork under `assets/`; icon paths in the manifest and command
are relative to that directory.

`npm run publish` uses Raycast's publishing CLI to submit a review pull request.
It requires network access and GitHub authentication. Publication requires
Raycast's review and acceptance.

## Source Organization

- `src/jw-library-linker.tsx`: Raycast view, search orchestration, and actions.
- `src/library.ts`: container discovery, asynchronous local reads, SQLite, and caching.
- `src/search.ts`, `src/publications.ts`, `src/bookmarks.ts`: parsing and link generation.
- `src/bible-*.ts`: German names and numeric reference bounds.
- `tests/`: Node test suites and synthetic fixtures.
- `assets/`: packaged artwork; `tools/render-icon.swift` regenerates the original icon.

Source is MIT licensed. See [NOTICE.md](NOTICE.md) for provenance and integration
notices. Keep local database files and container identifiers out of contributions.
