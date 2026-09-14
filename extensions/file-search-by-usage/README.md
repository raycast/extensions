# File Search by Usage

Search local and cloud files from Raycast, ranked by how you use them. In **Usage** mode the first results are the ones you have opened after this query before, then the best name matches, then files by usage and date.

The extension builds its own index with `fd` and searches it with SQLite FTS5.

## Requirements and setup

You need Raycast on macOS and [fd](https://github.com/sharkdp/fd) to build the index:

```bash
brew install fd
fd --version
```

1. Open **Search Index Settings** and check the folders and ignore patterns.
2. Run **Rebuild Search Index**. Rebuilds happen only when you ask; nothing is scheduled.
3. Open **Search Files and Folders** to search. You can give it a Raycast hotkey.

The extension looks for fd on `PATH` and in the usual install locations. If yours is somewhere unusual, put its full path in the **Search Index** preference (`fdPath`). Raycast supplies Node.js and SQLite with FTS5, so you do not install those yourself.

Raycast needs permission to read your folders. If a folder comes back empty, check System Settings, Privacy & Security, including Full Disk Access. Cloud folders and shared-folder shortcuts have to be reachable through their locally mounted provider. The extension does not sign in to any cloud account.

Before the first rebuild, search uses remembered paths and standard locations. Folder browsing and typed paths work without an index. Searching an existing index never runs fd.

## Index scope and rebuilding

By default the index covers your home folder and any Google Drive mounts it detects, skipping hidden names, common caches, and your ignore patterns. `/Applications` is not included.

In **Search Index Settings** you can:

- Add a scope with `⌘N`, and remove one you added with `⌃D`.
- Add fd ignore patterns such as `*.tmp`, `build`, or `**/tmp/**`.
- Turn on **Include Hidden Files** to index dot-prefixed names.
- Turn on **Use Ignore Files** to respect `.gitignore`, `.ignore`, and `.fdignore`. This is off by default.

Some exclusions always apply, including `.git` and `node_modules`. The settings screen lists them. Turning off automatic Google Drive detection does not exclude Drive folders that sit under another scope, such as your home folder.

Changes take effect on the next rebuild. Visible symbolic links, including Google Drive shared-folder shortcuts, are followed even when their target lives in a hidden directory.

You can keep searching during a rebuild. New names may not be searchable until the final index write; change the query or press `⌘R` after it finishes. A large or cold cloud folder can take minutes to scan, and a large index can occupy hundreds of megabytes. A scan that fails partway keeps what it already had, so an unreachable mount does not empty your index.

## Searching

The search field responds as you type. Raycast hands your latest text to the extension after a short pause, about 250 ms, so fast typing is not interrupted by list updates.

In Everywhere, the index matches **word prefixes in filenames**, ignoring case. `rep final` finds `report 2026 final.xlsx` in either word order. It does not search file contents or enclosing folder names. `bar` matches `foo-bar.txt` but not `foobar.txt`.

Indexed search starts at **three characters per term**. Shorter terms are dropped, and a query with only short terms falls back to remembered paths. Remembered and directly read paths also match on substrings, letters in order, and paths.

| Query                              | Meaning                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `report -d` / `report -f`          | Folders / files matching `report`                          |
| `report ext:pdf,docx`              | Match either extension                                     |
| `report after:2026-01 before:2027` | Modification-date range                                    |
| `report size:>10mb`                | Files larger than 10 MB                                    |
| `.config`                          | Include matching hidden names                              |
| `-d .`                             | Hidden folders from directly read or remembered candidates |
| `~/Documents/`                     | List a folder directly, even outside the index             |
| `~/Documents/rep`                  | Filter that folder's entries by name                       |

Filters combine. Dates accept `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` with UTC boundaries. Sizes accept `b`, `kb`, `mb`, or `gb` in multiples of 1024. A query made only of filters does not reach the index, so include a name term. Use `-f` with `ext:pdf` if you want to exclude folders whose names end in `.pdf`.

An absolute or `~/` path switches Everywhere into direct path browsing. There, filter by type with the dropdown rather than by appending `-d` or `-f`.

The top-right menu holds two independent choices: **All Types / Directory / File**, and **Usage / Date Modified / Date Created / Name / Size**. Each choice persists across command runs. An explicit `-d` or `-f` overrides the saved type for that query. Name sorts alphabetically with natural number ordering; date and size sorts put newest or largest first.

Opening an item or entering a folder records usage and remembers the query you used. In Usage mode a remembered pairing comes first and can skip name and extension matching; type, date, and size filters still apply. Selecting, previewing, and copying record nothing.

## Folder navigation and results

- `⏎` opens the selected item. For a folder it opens Finder.
- `⇧⌘↓` browses inside a folder. Queries there match **direct children only**, never deeper.
- `⇧⌘↑` goes up and selects the folder you just left.
- `⇧⌘H` returns to Everywhere with an empty query. Sort, type, and session hidden-file choices stay as they were.

Changing folders clears the query. No folder history is kept. Folder contents refresh on their own, with a five-second poll to catch change notifications that were missed. `⌘R` refreshes by hand.

There are **at most 50 results in the list**, drawn from up to 50 index candidates plus remembered paths. Folder browsing reads at most 3,000 children within a three-second budget, then filters and ranks what it read. These limits can hide matches. Narrow the query, or enter a folder, when the status line reports a limit.

The status line shows the location, the count, and progress: yellow while waiting, green when the results have settled, orange when they are partial, red when a read failed. A notice can appear alongside green, such as a display limit or an incomplete index. **You can open any visible result or enter a folder without waiting for green.** Cold storage and broad queries can take longer than 100 ms.

**Hidden files:** `⇧⌘.` changes visibility for this run of the command; reopening it restores your preference. A dot-prefixed query also includes hidden names. Neither adds names to the index: for that, turn on **Include Hidden Files** and rebuild. Direct folder browsing shows hidden children without an index.

**Escape:** Raycast owns clear-text and Back. Back from a folder returns to the extension's default screen. Known issue: the next Escape after that does not reliably exit to Raycast. `⇧⌘H` returns to the start screen but does not exit.

## Keyboard shortcuts

| Shortcut      | Action                             |
| ------------- | ---------------------------------- |
| `⏎`           | Open selected item                 |
| `⌘↩`          | Show in Finder                     |
| `⌘Y`          | Quick Look                         |
| `⌘O`          | Open With…                         |
| `⇧⌘↓` / `⇧⌘↑` | Enter folder / go to parent        |
| `⇧⌘H`         | Return to Start                    |
| `⌘[` / `⌘]`   | Previous / next search             |
| `⇧⌘.`         | Toggle hidden files for this run   |
| `⌘.`          | Pin / unpin                        |
| `⌘I`          | Show / hide details                |
| `⌘P`          | Open the type and sort menu        |
| `⌃⌘C`         | Copy Path                          |
| `⌥⌘C`         | Copy Name                          |
| `⇧⌘C`         | Copy File                          |
| `⌥⌘A`         | Remember this search for this item |
| `⇧⌘R`         | Rebuild Search Index               |
| `⌘R`          | Refresh                            |
| `⌥⌘R`         | Reset this item's usage ranking    |
| `⌃X`          | Move selected item to Trash        |

## Privacy and data

The extension sends no analytics, filenames, or usage history anywhere. Its index stores names, paths, sizes, and dates, not file contents. Everything stays in Raycast's storage on your Mac. Reading a cloud folder can still make the provider fetch metadata or content.

**Clear All Rankings…** clears recorded usage and nothing else. **Delete All Data and Cache…**, also a standalone command, clears usage, pins, saved searches, remembered pairings, index settings, indexes, and old caches. Each asks for confirmation and leaves your files alone. Your type and sort choices and the extension preferences survive deletion.

If indexing is running, deletion changes nothing and asks you to retry. If a deletion step fails, earlier steps may already have finished. **Move to Trash** is different: it moves the selected file or folder to the macOS Trash.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the implementation, ranking details, measurements, and release checks.
