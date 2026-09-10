# File Search by Usage

File Search by Usage finds files and folders across your Mac and cloud drives. In Usage mode, recent and frequently used items rise to the top. When you type a query, learned shortcuts and name-match quality take priority over usage scores.

## Fast results without waiting for Spotlight

Speed matters most when you need a file you work with often. The extension searches history and cached locations first, so you can open a matching result without waiting for a whole-disk search.

**You do not need to wait for the search to finish.** As soon as the item you want appears, select it and press `⏎` to open it. To browse inside a folder in the extension, select it and press `⌥⌘↓`; you can then search within that folder. Both actions work while more results are still arriving.

### What happens during an Everywhere search

1. **Memory results appear first.** The extension matches history, pins, imported recent files, remembered paths, and indexed Google Drive locations as you type. Cached paths are checked in the background. Earlier searches help populate this cache, so repeat searches can be faster.
2. **Spotlight looks for more names.** After a short pause in typing, the ordinary Spotlight name search starts and adds results to the same list. It searches indexed locations beyond those already in memory.
3. **A broader search finds fuzzy names.** For a search term containing only letters and numbers, a second Spotlight pass looks for names whose letters match in order, such as `foob` for `foo_bar`. This also works on a first search, before that item is cached.
4. **Usage information refines the order.** While results arrive, the extension checks file details and reads available macOS usage metadata. With Usage selected, better name matches and updated usage scores can move items up or down the list. This work overlaps the searches rather than waiting until the end.

The full search can take several seconds, or longer on a slow cloud drive. Items appearing and moving around during that time are normal: you are seeing results as they become available, not a finished list held back until every search completes. The progress indicator stays active while work remains. Once you select a different item, the highlight stays attached to that file if the list reorders, provided it remains among the retained results.

Inside a folder, the list contains only its direct children, with or without a query. Typing filters those files and folders; it never searches their contents or descends into subfolders. For example, searching `cloud` inside `Library` can find `CloudStorage`, but not files inside it. Enter a subfolder with `⌥⌘↓` to search its direct children, or return to Everywhere for a wider search. Folder contents are read directly, including Google Drive folders that Spotlight does not index. Available usage metadata can still update their ranking.

Changing the query or entering another folder cancels the previous search. Otherwise, search keeps collecting matches until its sources finish or a safety limit is reached. Selecting a row, using Quick Look, or showing details does not interrupt it. Collection continues whether you scroll or not. You can open an item or enter a folder at any stage—there is no need to wait for the green status indicator.

Folder navigation uses one search screen, with no saved folder history. Changing folders releases the previous results and clears the search field. **⌥⌘↑** goes to the parent folder and selects the folder you just left. To return to Everywhere, leave the command and open it again. Raycast's back button leaves the command; Escape keeps Raycast's usual behavior for clearing text or leaving the command.

Setup continues while you navigate. Closing the command or choosing Stop Setup cancels the run. Any progress already saved is kept; you can run setup again from Actions.

### Limits for broad searches

Search retains up to 500 matches for ranking, but displays at most 100 to reduce memory use. Scrolling does not expand this limit. If the display limit is reached, narrow your query or search inside a folder. Live discovery collects up to 5,000 candidate paths, reads up to 3,000 entries per folder, and visits up to 1,000 folders during recursive search. Cached sources also limit how many matching entries they return. These limits can leave some matches out; the list is not guaranteed to contain the best matches across every file on disk.

Collection limits report partial coverage; the display limit has a separate notice and can appear after all search stages finish. Use a more specific query or enter a folder to search a smaller area. Results already found remain usable: you can still open an item or navigate into a folder. Setup indexing has its own separate limits.

## Commands

| Command                    | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| Search Files and Folders   | Search local and cloud storage                                                   |
| Index Google Drive         | Index shortcuts and shared-folder contents that Spotlight cannot see             |
| Populate from Recent Files | Seed the cache with recent documents and nearby files                            |
| Delete All Data and Cache  | Clear search history and indexes without touching your files or display settings |

Assign a Raycast hotkey to **Search Files and Folders** if you use it often.

## Setup

Setup is optional. Ordinary Spotlight search works from the first launch and does not require another setup run when you reopen the extension.

Choose **Set Up Search** to build an initial cache. The main-view prompt stays available until you start a setup run; simply opening the extension or cancelling the confirmation does not dismiss it. After that run finishes or stops, setup is available from **Actions (⌘K) → Set Up Search**, even if the results were partial. After confirmation, setup imports recent files, then indexes Google Drive shortcuts and shared-folder contents that Spotlight cannot find. The recent-file step uses documents opened in the last seven days within your home folder, along with their parent folders and immediate contents.

You can keep searching during setup. On the starting screen, its progress row shows the current scan, items found, elapsed time, and the time allowed for that step. The message updates every second, even while a cloud provider is slow; it does not guess a completion percentage. In Actions, choose **Skip Recent Files** or **Skip Google Drive** before starting, or **Stop Setup** while it runs. Incomplete steps remain available to retry there, without bringing back the main prompt. If no unfinished steps remain, **Set Up Search** offers to refresh both sources after confirmation. The standalone **Populate from Recent Files** and **Index Google Drive** commands remain available later.

During setup, the import considers up to 500 recent documents and scans up to 50 parent folders, with up to 500 nearby entries per folder. The recent-file cache holds up to 10,000 entries within a 16 MB storage allowance. These are maximums; the time limit or an unreadable folder can stop a scan sooner.

The import runs in the background. Recent documents join the starting list, while neighboring files become searchable as you type. It reads names and metadata, not document contents, and does not count imported files as files you opened through this extension. If a limit is reached, saved progress is kept and the notice says the import is partial. Spotlight may miss files or lack last-opened metadata, so this is a starting cache, not a complete history.

If an imported file is slow to check, its cached entry remains searchable while the check continues. A read error leaves that cached entry available and is reported as partial. Its details may be out of date until a later check succeeds. Files confirmed missing are removed from the current results. Size and date filters use fresh metadata when it is available.

If macOS blocks access to protected folders, check Raycast's permissions under System Settings › Privacy & Security, including **Full Disk Access**. Permission changes do not make offline cloud files available or add missing files to Spotlight's index.

If you use Google Drive shortcuts or shared folders, run **Index Google Drive** whenever those folders change, or if you skipped it during setup. A cold or network-backed drive can make indexing take longer. Setup allows up to one minute for recent files, including up to 15 seconds for last-opened metadata, and ten minutes each for Drive shortcuts and shared-folder contents. Item and depth limits still apply. If a scan stops at a limit, the final message names it; saved results remain searchable.

## Searching

Type part of a name as you normally would. Matching is case-insensitive and supports prefixes, words, substrings, and fuzzy matches.

Several words can describe both the location and the item. For example, `foo baz` finds an item named `baz` somewhere inside a `foo` folder. Every word must appear somewhere in the path. In Usage mode, matches in the same order rank above matches in a different order.

In Everywhere, the search bar also accepts an absolute path or a path beginning with `~/`. A trailing slash lists that folder and may include the folder itself, so `~/.config/` goes straight to it. In this path-bar mode, text is interpreted as a path: use the dropdown to filter by type rather than appending query filters. After navigating into a folder, the search bar filters its direct children instead.

### Query examples

These examples assume **All Types** is selected. Any ranking preferences described below apply to **Usage** sorting. Whether a matching item appears also depends on the available indexes, permissions, and collection limits.

| Query       | What it does                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `foo`       | Finds names such as `foo.txt`, `foo-bar.md`, and `my-foo-notes.txt`                              |
| `FOO`       | Finds the same results as `foo`; matching is case-insensitive                                    |
| `bar`       | Finds `foo-bar.txt` by word prefix and `foobar.txt` by substring                                 |
| `fbr`       | Finds `foo-bar.txt` by matching the letters in order                                             |
| `foo baz`   | Finds `baz.txt` inside a path such as `~/foo/bar/`; both terms must appear somewhere in the path |
| `baz foo`   | Finds the same path; Usage mode favors equally good matches whose path follows the query order   |
| `foo/bar`   | Prefers an item named `bar` inside a `foo` folder                                                |
| `foob`      | Can find `/foo/bar` by a compact fuzzy match across path components                              |
| `~/foo/`    | Lists the contents of `~/foo`                                                                    |
| `~/foo/ba`  | Lists entries in `~/foo` whose names match `ba`                                                  |
| `/tmp/foo/` | Lists the contents of an absolute path                                                           |

Fuzzy matching keeps the letters in the order you typed them. Name matching allows gaps, as in `fbr` for `foo-bar`. A fallback across the full path requires at least four characters and a compact match, so letters scattered across a long path are rejected.

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

Dates may be written as `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; boundaries use midnight UTC. Size limits may contain decimals; valid units are `b`, `kb`, `mb`, and `gb`, using multiples of 1024. A size without a unit is read as bytes. Extension matching is case-insensitive. Use a comma-separated list such as `ext:md,txt`, or repeat the filter as in `ext:md ext:txt`.

Filters can appear anywhere in a name query and can be combined. For example, `foo -f ext:txt after:2026-01-01 before:2027 size:<10mb` finds files that match `foo`, end in `.txt`, fall within those modification-date bounds, and are smaller than 10 MB.

For a whole-disk extension search, include a name term such as `foo ext:txt`. A filter by itself narrows the folder or results already in memory; it does not launch an unrestricted whole-disk search.

Hidden files are controlled by the **Show hidden files** preference and by dot-prefixed queries. A bare `.` shows hidden entries and `-d .` shows hidden folders. In Everywhere, `.foo bar` can search inside a hidden `.foo` folder in your home directory without relying on Spotlight. Inside a folder, these queries still filter only direct children.

Whole-disk Spotlight search begins when the longest name term has at least three characters. Inside a folder, the extension filters direct children immediately; it does not launch a recursive Spotlight search. Immediate history and cached results do not wait for Spotlight.

Open folder listings refresh automatically when files change. Cloud drives may take up to five seconds to trigger a refresh if they do not send a change notification; reading the updated listing can take longer. Press `⌘R` to request a refresh immediately.

## Results and status

Results arrive in one list even though they come from different sources. As the [search phases](#what-happens-during-an-everywhere-search) progress, newly found items join the list and usage information can change their order. The list may move several times before the search finishes; this is expected.

On startup and when entering a folder, the highlight stays on the first result as items arrive. Once you select another item or type a query, the extension stops keeping the highlight at the top. Your selection then follows the same file if the list reorders. Going up selects the folder you just left.

The section header tells you whether more work is pending:

- `🟡` means the list may still change.
- `🟢` means every applicable stage has finished without a stage failure or partial result. Separate notices can still report a display cap or an incomplete saved Google Drive index.
- `🟠` means some results or metadata are unavailable, or a collection limit was reached. Other stages may still be running. A slow usage-metadata batch can time out without stopping the remaining search.
- `🔴` means Spotlight, a folder, or usage metadata could not be read. Existing results remain available.

The single-line section heading combines a shortened location, result count, and status. While work is pending or incomplete, it names the applicable stages: memory, folder, Spotlight, and ranking. Spotlight includes both the ordinary and broader fuzzy passes when applicable. Google Drive index notices identify whether shortcut or shared-folder indexing reached its time, depth, or item limit. An older partial index reports only that it stopped early until the next indexing run. You can open an existing result with `⏎` or enter a folder with `⌥⌘↓` without waiting for green.

Paths returned by Spotlight are cached. A later search for the same item can often find it in the immediate pass.

## Ranking

The top-right dropdown has two sections: **Type** and **Sort by**. Choose **All Types**, **Directory**, or **File** to filter results, then choose a sort order. Changing one leaves the other unchanged. The closed menu shows both, for example **Directory · Name**. Both choices are remembered when you navigate folders or reopen the command.

The type filter applies everywhere, including inside folders and when typing a path. In name queries, an explicit type directive such as `-d` or `-f` overrides it without changing the saved setting. When the effective type differs from the saved choice, the menu marks it as a query override. Extension filters match name suffixes: use **File** or `-f` with `ext:pdf` to exclude folders whose names also end in `.pdf`. Size filters always exclude folders.

Without a query, Usage mode blends three signals:

- Opens recorded by this extension
- File modification time
- macOS usage metadata, when available

Recorded usage follows an exponential decay measured in actions, not calendar days. Recent work gradually replaces older work, but taking time away from the extension does not reduce every score. Repeated opens have diminishing effect so one item cannot permanently crowd out the rest.

Opening an item with `⏎` or navigating into a folder with `⌥⌘↓` records usage. Selecting a row, Quick Look, copying, and Open With do not add to that recorded count.

With **Usage** selected, match quality comes first and usage orders results within the same match tier. **Name** sorts the whole result list alphabetically, with natural number ordering (`foo2` before `foo10`). **Date Modified**, **Date Created**, and **Size** sort the whole list newest or largest first. These explicit sort choices do not group results by match quality. Your last sort choice is remembered across folder navigation and command runs.

The extension also learns query-to-item pairings when you open a result or navigate into its folder. In Usage mode, learned pairings rank ahead of textual matches. A learned item can match even if its name or extension does not match the query; type, size, and date filters still apply. Use `⌘⌥A` to teach a pairing without opening the item.

## Google Drive

Google Drive represents some shared folders as symbolic links under a location Spotlight does not catalog. As a result, Spotlight may find neither the shortcut name nor anything inside the shared folder.

**Index Google Drive** records:

- The names assigned to shortcuts in My Drive
- Paths inside shared folders

Browsing one of those folders reads its direct children, so changes can appear before the next indexing run. It does not search recursively. In Everywhere, indexed paths and any applicable live folder expansion supplement Spotlight. The separate indexing scans have time, depth, and item limits; their notices say when a limit was reached.

If Google Drive is offline, unmounted, or becomes unreadable during an indexing run, the extension keeps the previous index and reports that the refresh failed.

If a refresh reaches its time, depth, or item limit, a previous complete, non-empty index is kept. The notice explains which index was kept and why the refresh stopped. When there is no complete index to protect, the partial results remain searchable.

Only one indexing run can be active at a time, including runs started from the action panel. A second request leaves the current run alone. After a crash, a retry can recover a lock older than ten minutes only if its owner process is confirmed to have stopped. If it remains busy after restarting Raycast, see lock recovery in [DEVELOPMENT.md](DEVELOPMENT.md).

A shortcut keeps its familiar display path, while visits and pins use the resolved target. This prevents the same folder from accumulating separate usage scores through its two paths.

Dropbox, OneDrive, and iCloud Drive normally expose shared folders as regular directories, so they do not need this workaround.

## Keyboard shortcuts

| Shortcut    | Action                                     |
| ----------- | ------------------------------------------ |
| `⏎`         | Open the selected item                     |
| `⌥⌘↓`       | Navigate into the selected folder          |
| `⌥⌘↑`       | Go to the parent folder                    |
| `esc`       | Raycast's usual clear-text / back behavior |
| `⌘[` / `⌘]` | Previous / next search                     |
| `⌘Y`        | Quick Look                                 |
| `⌘⇧O`       | Open With…                                 |
| `⌘⇧F`       | Show in Finder                             |
| `⌘.`        | Pin or unpin                               |
| `⌘I`        | Show or hide details                       |
| `⌘P`        | Open the type and sort menu                |
| `⌃⌘C`       | Copy the path                              |
| `⌥⌘C`       | Copy the name                              |
| `⇧⌘C`       | Copy the file                              |
| `⌘⌥A`       | Remember this search for the selected item |
| `⌘⇧I`       | Index Google Drive                         |
| `⌘R`        | Refresh                                    |
| `⌘⌥R`       | Reset usage ranking for the selected item  |

Raycast reserves `⌥↑` / `⌥↓` for paging and `⌘↑` / `⌘↓` for moving between sections, so search history uses brackets instead.

The following actions deliberately have no shortcut: **Move to Trash**, **Clear All Rankings…**, and **Delete All Data and Cache…**. Moving a file uses the macOS Trash and can be undone there. The two data-clearing actions ask for confirmation and do not modify your files.

## Privacy and stored data

The extension code does not send analytics, telemetry, filenames, or usage history to a remote service. Its data stays in Raycast's storage on your Mac. Accessing a cloud-backed folder may still cause macOS or the installed cloud provider to fetch directory metadata or file content.

Stored data includes usage scores, pins, search history, learned query shortcuts, cached Spotlight metadata, remembered Spotlight paths, the Google Drive index, and any imported recent-file paths and metadata. The extension also remembers the type and sort choices, whether you have run setup, and whether you completed or skipped each step.

**Clear All Rankings…** removes recorded usage only. **Delete All Data and Cache…** removes search history, pins, learned pairings, indexes, imported recent files, and setup state. It leaves your type and sort choices and extension preferences unchanged. Both actions are available from the action panel, and the full delete is also available as a standalone command.

Google Drive indexing, recent-file imports, and data deletion cannot run at the same time. If either scan is active, deletion leaves the data untouched and asks you to retry once it finishes. Deletion clears the setup choice too; the optional setup row appears again, but no files are imported without your approval.

History and cache writes are coordinated with deletion. Pending searches from before a reset cannot refill the cleared stores. A random reset marker remains in the extension's support folder; it contains no paths, queries, or usage history.

See [DEVELOPMENT.md](DEVELOPMENT.md) for architecture, tests, and the release checklist.
