# Público Changelog

## [Sections, Topics, and a Lot of Fixes] - {PR_MERGE_DATE}

### Added

- **34 section commands.** Go straight to any Público section: `Browse Politics`, `Browse World`, `Browse Economy`, `Browse Sports`, `Browse Culture`, `Browse Science`, and more. Bind one to an alias or hotkey and skip the extension menu entirely.
- **A way out when a search finds nothing.** If no Público topic matches what you typed, `Browse Topic` offers to run the same query against Público's own full-text search in your browser.

### Changed

- **Every command title is now English and verb-led**, so the list reads as one system: `Browse Latest News`, `Browse Politics`, `Browse Topic`. Six Público mastheads keep their Portuguese names, because they are titles rather than generic sections: P3, Ípsilon, Fugas, Azul, Ecosfera, and Ímpar.
- **`Search News` is now `Browse Topic`**, which is what it actually does. It matches Público's own topics rather than searching article text, so names, places, teams and subjects work well while descriptive phrases may find nothing.
- **Enter now opens the article in your browser.** It previously opened a reader inside Raycast; see Removed below.
- **Published dates are shorter**, `04/08/2026, 19:30`, so they are no longer cut off in the detail pane. Times are shown in your own timezone.
- Searching still works in Portuguese. Every command keeps its Portuguese name as a keyword, with and without accents, so `desporto`, `saude` and `ultimas` all find the right command.

**Your aliases and hotkeys keep working.** No command changed its identity, only its displayed name.

### Fixed

- **Videos, multimedia and podcasts showed a completely different article's author, date and keywords.** Those URLs end in a timestamp, and the article id was being read out of the URL, so it picked up the time instead and loaded whatever article happened to have that id.
- **Publication times were wrong outside UTC+1**, and could show the wrong day. Público sends some timestamps without a timezone, and those are now correctly read as Lisbon time before being converted to yours.
- **Some summaries showed raw HTML** such as `<em>` and `<span>` as visible text.
- A search that fails no longer wipes the results already on screen.

### Removed

- **`Read Article`.** Público's API does not return article text, so the reader could only ever tell you to open your browser. Enter now does that directly.
- **`Summarize` and `View Summary`.** Both were placeholders that did nothing, and one was unreachable. They will return if the article text ever becomes available.

## [Initial Version] - 2026-03-12

### Added

- Initial release of the Público extension.
- View the latest headlines from Público directly from your Raycast command bar.
- Access the most popular articles based on engagement.
- Search for any Público news article by keyword.

A fast, distraction-free way to stay informed with Portuguese news, without ever opening your browser.
