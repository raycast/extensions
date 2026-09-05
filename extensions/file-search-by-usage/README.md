# File Search by Usage

File Search by Usage finds files and folders across your Mac and cloud drives, then ranks them by what you actually open. Recent and frequently used items rise to the top, while a strong name match still wins when you type a query.

The extension combines two searches:

- History, pins, cached folders, and indexed Google Drive locations appear immediately.
- Spotlight starts after a short delay and adds results from the rest of the disk.

You can open a result, move into a folder with `⌘→`, or start from the folder in the frontmost Finder window.

## Commands

| Command                        | Purpose                                                               |
| ------------------------------ | --------------------------------------------------------------------- |
| Search Files and Folders       | Search local and cloud storage                                        |
| Search Finder's Current Folder | Search the frontmost Finder folder and its descendants                |
| Index Google Drive             | Index shortcuts and shared-folder contents that Spotlight cannot see  |
| Delete All Data and Cache      | Remove everything stored by the extension without touching your files |

Assign a Raycast hotkey to **Search Files and Folders** if you use it often.

## Setup

Give Raycast **Full Disk Access** under System Settings › Privacy & Security › Full Disk Access. Without it, macOS may hide files outside your home folder or in cloud storage.

**Search Finder's Current Folder** also needs permission to control Finder. macOS asks the first time you run the command. If permission is missing or no Finder window is open, the extension explains the problem and offers to search everywhere instead.

If you use Google Drive shortcuts or shared folders, run **Index Google Drive** after installation and whenever those folders change. A cold or network-backed drive can make indexing take longer.

## Searching

Type part of a name as you normally would. Matching is case-insensitive and supports prefixes, words, substrings, and compact fuzzy matches.

Several words can describe both the location and the item. For example, `foo baz` finds an item named `baz` somewhere inside a `foo` folder. Every word must appear somewhere in the path. Matches in the same order rank above matches in a different order.

The search bar also accepts an absolute path or a path beginning with `~/`. A trailing slash lists that folder, so `~/.config/` goes straight to it.

### Query examples

| Query       | What it does                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `foo`       | Finds names such as `foo.txt`, `foo-bar.md`, and `my-foo-notes.txt`                              |
| `FOO`       | Finds the same results as `foo`; matching is case-insensitive                                    |
| `bar`       | Finds `foo-bar.txt` by word prefix and `foobar.txt` by substring                                 |
| `fbr`       | Finds `foo-bar.txt` by matching the letters in order                                             |
| `foo baz`   | Finds `baz.txt` inside a path such as `~/foo/bar/`; both terms must appear somewhere in the path |
| `baz foo`   | Finds the same path, but below an equally good result whose path follows the order in the query  |
| `foo/bar`   | Prefers an item named `bar` inside a `foo` folder                                                |
| `foob`      | Can find `/foo/bar` by a compact fuzzy match across path components                              |
| `~/foo/`    | Lists the contents of `~/foo`                                                                    |
| `~/foo/ba`  | Lists entries in `~/foo` whose names match `ba`                                                  |
| `/tmp/foo/` | Lists the contents of an absolute path                                                           |

Fuzzy matching keeps the letters in the order you typed them. It accepts compact gaps, as in `fbr` for `foo-bar`, but rejects letters scattered across an unrelated long path.

### Filters

| Filter              | Meaning                      | Example                                           |
| ------------------- | ---------------------------- | ------------------------------------------------- |
| `-d`                | Folders only                 | `foo -d`                                          |
| `-f`                | Files only                   | `foo -f`                                          |
| `ext:`              | Match one or more extensions | `foo ext:txt`, `bar ext:md,txt`, `baz ext:tar.gz` |
| `after:`            | Modified on or after a date  | `foo after:2026-06`                               |
| `before:`           | Modified before a date       | `foo before:2026`                                 |
| `size:>` / `size:<` | Filter by size               | `foo size:>10mb`, `bar size:<1.5gb`               |
| `.`                 | Include hidden entries       | `.foo bar`, or `-d .` for hidden folders          |

Dates may be written as `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. Size limits may contain decimals; valid units are `b`, `kb`, `mb`, and `gb`, and a size without a unit is read as bytes. Extension matching is case-insensitive. Use a comma-separated list such as `ext:md,txt`, or repeat the filter as in `ext:md ext:txt`.

Filters can appear anywhere in a name query and can be combined. For example, `foo -f ext:txt after:2026-01-01 before:2027 size:<10mb` finds files that match `foo`, end in `.txt`, fall within those modification-date bounds, and are smaller than 10 MB.

For a whole-disk extension search, include a name term such as `foo ext:txt`. A filter by itself narrows the folder or results already in memory; it does not ask Spotlight to return every file of that type, which could exceed the search limit before useful results are ranked.

Hidden files are controlled by the **Show hidden files** preference and by dot-prefixed queries. A bare `.` shows hidden entries, `-d .` shows hidden folders, and a query such as `.foo bar` searches inside a hidden `.foo` folder directly because Spotlight does not index hidden content.

Whole-disk Spotlight search begins after three characters. Inside a folder, search begins after two. Immediate history and cached results do not wait for Spotlight.

Open folder listings refresh automatically when files change. Cloud drives may take up to five seconds to trigger a refresh if they do not send a change notification; reading the updated listing can take longer. Press `⌘R` to request a refresh immediately.

## Results and status

Results arrive in one list even though they come from different sources. A better Spotlight match may move above an earlier result when the delayed search finishes.

The selected row is tied to its file path. If the list reorders, the highlight moves with the same file instead of silently selecting a different one.

The section header tells you whether more work is pending:

- `🟡` means the list may still change.
- `🟢` means every applicable stage has finished.
- `🟠` means the search finished, but some optional usage metadata was unavailable or the metadata pass reached its time limit.
- `🔴` means Spotlight, a folder, or usage metadata could not be read. Existing results remain available.

The subtitle names the active stages: memory, folder, Spotlight, and ranking. Google Drive index notices identify whether shortcut or shared-folder indexing reached its time, depth, or item limit. An older partial index reports only that it stopped early until the next indexing run. You can open an existing result without waiting for green.

Paths returned by Spotlight are cached. A later search for the same item can often find it in the immediate pass.

## Ranking

Without a query, the extension blends three signals:

- Opens recorded by this extension
- File modification time
- macOS usage metadata, when available

Recorded usage follows an exponential decay measured in actions, not calendar days. Recent work gradually replaces older work, but taking time away from the extension does not reduce every score. Repeated opens have diminishing effect so one item cannot permanently crowd out the rest.

With a query, match quality comes first and usage orders results within the same match tier. The extension also learns query-to-item pairings when you choose a result. Use `⌘⌥A` to teach a pairing without opening the item.

## Google Drive

Google Drive represents some shared folders as symbolic links under a location Spotlight does not catalog. As a result, Spotlight may find neither the shortcut name nor anything inside the shared folder.

**Index Google Drive** records:

- The names assigned to shortcuts in My Drive
- Paths inside shared folders

Searching inside one of those folders reads it directly, so changes can appear before the next indexing run. The scan is bounded by time, depth, and result count. If a bound is reached, the UI says that the result or index is incomplete.

If Google Drive is offline, unmounted, or becomes unreadable during an indexing run, the extension keeps the previous index and reports that the refresh failed.

Only one indexing run can be active at a time, including runs started from the action panel. A second request leaves the current run alone. After a crash, a leftover lock expires within ten minutes.

A shortcut keeps its familiar display path, while visits and pins use the resolved target. This prevents the same folder from accumulating separate usage scores through its two paths.

Dropbox, OneDrive, and iCloud Drive normally expose shared folders as regular directories, so they do not need this workaround.

## Keyboard shortcuts

| Shortcut    | Action                                     |
| ----------- | ------------------------------------------ |
| `⏎`         | Open the selected item                     |
| `⌘→`        | Navigate into the selected folder          |
| `⌘←`        | Go to the parent folder                    |
| `esc`       | Return to the previous Raycast screen      |
| `⌘[` / `⌘]` | Previous / next search                     |
| `⌘Y`        | Quick Look                                 |
| `⌘⇧O`       | Open With…                                 |
| `⌘⇧F`       | Show in Finder                             |
| `⌘⇧P`       | Pin or unpin                               |
| `⌘I`        | Show or hide details                       |
| `⌘P`        | Open the sort menu                         |
| `⌘⇧,`       | Copy the path                              |
| `⌘⌥A`       | Remember this search for the selected item |
| `⌘⇧I`       | Index Google Drive                         |
| `⌘R`        | Refresh                                    |
| `⌘⌥R`       | Reset usage ranking for the selected item  |

Raycast reserves `⌥↑` / `⌥↓` for paging and `⌘↑` / `⌘↓` for moving between sections, so search history uses brackets instead.

The following actions deliberately have no shortcut: **Move to Trash**, **Clear All Rankings…**, and **Delete All Data and Cache…**. Moving a file uses the macOS Trash and can be undone there. The two data-clearing actions ask for confirmation and do not modify your files.

## Privacy and stored data

The extension code does not send analytics, telemetry, filenames, or usage history to a remote service. Its data stays in Raycast's storage on your Mac. Accessing a cloud-backed folder may still cause macOS or the installed cloud provider to fetch directory metadata or file content.

Stored data includes usage scores, pins, search history, learned query shortcuts, cached Spotlight metadata, remembered Spotlight paths, and the Google Drive index.

**Clear All Rankings…** removes recorded usage only. **Delete All Data and Cache…** removes everything stored by the extension. Both are available from the action panel, and the full delete is also available as a standalone command.

See [DEVELOPMENT.md](DEVELOPMENT.md) for architecture, tests, and the release checklist.
