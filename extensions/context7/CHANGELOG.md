# Context7

## [Raycast API 2.0] - 2026-08-25

- Updated to Raycast API 2.0
- Updated dependencies

## [My Libraries, My Snippets, and Wider Search] - 2026-08-18

- Added **My Libraries** — save a library and its documentation is kept on disk, so opening it is instant and works offline. Shows when each library was last captured, with Refresh and Refresh All actions
- Added **My Snippets** — save individual snippets from any library and search them all in one place. Saved snippets are snapshots, so they survive a library refresh
- Library search now returns up to 30 results instead of 5, and falls back to the previous endpoint if the wider one is unavailable
- Added a sort control to **Search Libraries** — relevance, popularity, recently updated, trust score, or snippet count
- **Search Documentation** no longer requires a library ID to launch. It opens on **all** your libraries at once, searched instantly from the local copies; narrowing to a single library with the dropdown adds Context7's semantic search on top. Opening a library shows its documentation immediately instead of an empty search box
- Added **Ask Raycast AI** to any snippet, which explains it in place (requires Raycast Pro; hidden otherwise)
- The extension is now an **AI extension**: ask Raycast AI about any library and it can resolve the library, pull current documentation, and search the libraries you have saved — including offline
- Snippet rows now carry a one-line description, so a library that reuses a title like "Basic example" a dozen times is no longer a wall of identical rows
- Toggle the detail pane with `⌘⇧↵` in every snippet list
- Every result row now shows whether it is saved
- **Search Libraries** now opens on suggested searches instead of an empty favorites list
- **Search Documentation** now separates documentation from code snippets into their own sections, instead of mixing both under a "snippets" label
- Added a `Verbose Logging` preference for structured request and response logging
- Fixed keyboard shortcuts that were silently broken on Windows — the favorite, Quicklink, paste, and open-in-browser actions used `cmd`-only bindings despite the extension declaring Windows support
- Added a "Copy Error" action to every failure toast
- Replaced the deprecated `Icon.TextDocument` with `Icon.BlankDocument`
- Updated dependencies

## [Initial Release] - 2026-03-19
