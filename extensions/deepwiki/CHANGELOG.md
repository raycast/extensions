# Deepwiki Changelog

## [0.2.0] - 2024-09-17

### Added

- New command: **Crawl DeepWiki Docs**. This command crawls all documentation pages for a specified DeepWiki repository (e.g., `microsoft/vscode`) and copies the combined content to the clipboard in a Markdown format suitable for LLMs.
- Added a shortcut (`Cmd+Shift+K`) to the **Search Deepwiki Repos** command to trigger the new crawl command directly from a search result.

## [0.1.0] - 2024-09-17

### Added

- Initial release with two commands:
  - **Open Deepwiki Page**: Opens the DeepWiki page for a specific GitHub repo URL or identifier.
  - **Search Deepwiki Repos**: Searches repositories indexed by DeepWiki.
