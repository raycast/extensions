# Obsidian Bookmarks Changelog

## [Smarter Bookmark Search] - {PR_MERGE_DATE}

- Rank URL matches (ignoring query parameters) ahead of title, tag and note matches when searching bookmarks
- Filter results by tag with `#tag` tokens, on their own or alongside search terms (for example `raycast #dev`)
- Suggest matching tags while typing `#`, completed with Tab or Enter
- Fix bookmark search not matching titles, tags and URLs: those keys pointed at fields that don't exist on the indexed object, so only note contents were searched

## [Edit Bookmarks] - {PR_MERGE_DATE}

- Add an "Edit Bookmark" action (<kbd>⌘</kbd>+<kbd>E</kbd>) to search results. It reopens the save form, prefilled with the bookmark's URL, title, favicon, tags and notes, and writes the changes back to the same note — its filename, save date and read state are left untouched.

## [Favicons] - {PR_MERGE_DATE}

- Show the favicon of each bookmarked website in search results, instead of a generic link icon. Falls back to the link icon when no favicon can be found.
- Allow overriding that favicon from a frontmatter field (configurable via the new "Favicon Field" preference; default is `favicon`). The value can be another website URL or a direct image URL.
- Add an optional "Favicon" dropdown to the save bookmark form. Typing a URL in its search field turns it into a selectable option showing the icon it resolves to, so the resulting icon is visible before saving.

## [1.0.5] - 2024-11-26

- Search for bookmarks in subfolders below the configured Bookmarks subfolder. This option is configurable via a new preferences checkbox; default is true (enabled subfolder search).
- Allow search bookmarks filtering by subfolder (similar to the existing tags filtering)
- Allow required tags: required tags are automatically added to all saved bookmarks. Only notes with any required tag are shown during search.
- Speed up search by caching mtime in local storage, and using cached files if the file on disk hasn't changed.
- Speed up search by streaming in results from the disk read as they become available
- Fix a bug with the save bookmark form where "Fetching link details" never disappears
- Show notifications on the LinkForm when the user attempts to save a duplicate bookmark. This is configurable via a preferences checkbox; default is true (duplicate check enabled)
- Add an action to clear cache files created by this extension
- Allow the user to specify a save subfolder. Search executes from the existing bookmarksPath. Save executes from saveSubfolder if it is specified, and bookmarksPath if it is not specified.
- Allow the user to specify subfolders to ignore during search
- Add a new form action when saving a bookmark to append the markdown content of the page to the notes section
- Add a checkbox option to preferences to get active tab title and url using the raycast extension. Will fallback to old jxa methods on error, or if disabled; default is false (use the old jxa method)

## [1.0.4] - 2024-07-30

- Fixed bug with useEffect

## [1.0.3] - 2024-07-26

- Added support for different chromium-based browsers

## [1.0.2] - 2024-04-23

- Added the datePrefix option, allowing users to choose whether to add date as a prefix

## [1.0.1] - 2023-12-19

- Added support for the [Arc browser](https://arc.net/).

## [Initial Release] - 2022-05-24

- This first release adds support for saving and searching bookmarks in Obsidian.
