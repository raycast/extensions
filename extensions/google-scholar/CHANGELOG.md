# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

*   **Comprehensive Search Form**: Advanced search capabilities mirroring Google Scholar's web interface (keywords, exact phrase, authors, publication, date range, word occurrence).
*   **Detailed Search Results**: Displays title, authors, snippet, publication, year, and citation count.
*   **Pagination**: "Load More Results" functionality to fetch subsequent pages of search results.
*   **Sorting**: Ability to sort results by relevance or date via a dropdown menu.
*   **BibTeX Citations**: Action to copy BibTeX-formatted citations to the clipboard (`⌘⇧C`).
*   **PDF & Article Links**: Direct actions to open article links and PDF links (if available) in the browser.
*   **Caching System**: Implemented caching for search results to improve performance and reduce redundant requests.
*   **User-Agent Rotation**: Rotates user agents for requests to Google Scholar.
*   **Robust Error Handling**: Improved error handling for network issues and Google Scholar rate limiting/blocking, including retries with exponential backoff.
*   **Code Refactoring**: Significant refactoring of the codebase into separate components (`FormComponent`, `SearchResultsComponent`) and utility modules (`parser.ts`, `cache.ts`, `userAgents.ts`) for better organization and maintainability.
*   **README**: Added a comprehensive README file.