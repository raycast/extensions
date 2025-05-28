# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

*   **Comprehensive Search Form**: Advanced search capabilities mirroring Google Scholar's web interface (keywords, exact phrase, authors, publication, date range, word occurrence).
*   **Detailed Search Results**: Displays title, authors, snippet, publication, year, and citation count.
*   **Pagination**: "Load More Results" functionality to fetch subsequent pages of search results.
*   **Sorting**: Ability to sort results by relevance or date via a dropdown menu.
*   **Bookmarks System**: Complete bookmark functionality for saving and managing articles
    *   Save/remove bookmarks with `⌘D` shortcut from search results
    *   Dedicated "Show Bookmarks" command to view all saved articles
    *   Bookmark status indicator (star icon) in search results
    *   Persistent storage of bookmarked articles with metadata
    *   Toast notifications with quick bookmark management actions
*   **AI Tools Integration**: Four AI tools for programmatic access to Google Scholar functionality
    *   `search-scholar`: Search Google Scholar with structured parameters
    *   `getSavedBookmarks`: Retrieve all saved bookmarked articles
    *   `toggleArticleBookmark`: Add or remove article bookmarks
    *   `checkIfArticleIsBookmarked`: Check bookmark status of articles
*   **Author Profile Links**: Direct access to author profiles 
    *   Quick actions to open author profiles from search results and bookmarks
    *   Separate action section for author-related links
*   **Enhanced Bookmark Management**: Advanced bookmark organization features
    *   Multiple sorting options (date saved, title, year)
    *   Detailed bookmark metadata with save timestamps
    *   Bulk "Clear All Bookmarks" functionality with confirmation dialog
    *   Comprehensive bookmark detail view with all article information
*   **BibTeX Citations**: Action to copy BibTeX-formatted citations to the clipboard (`⌘⇧C`)
    *   Modular BibTeX generation utility
    *   Available in both search results and bookmarks views
    *   Properly formatted BibTeX entries with all available metadata
*   **PDF & Article Links**: Direct actions to open article links and PDF links (if available) in the browser.
*   **Caching System**: Implemented caching for search results to improve performance and reduce redundant requests.
*   **User-Agent Rotation**: Rotates user agents for requests to Google Scholar.
*   **Robust Error Handling**: Improved error handling for network issues and Google Scholar rate limiting/blocking, including retries with exponential backoff.
*   **Code Refactoring**: Significant refactoring of the codebase into separate components (`FormComponent`, `SearchResultsComponent`) and utility modules (`parser.ts`, `cache.ts`, `userAgents.ts`, `bookmarks.ts`, `bibtex.ts`) for better organization and maintainability.
*   **README**: Added a comprehensive README file.

### Enhanced

*   **Search Results Interface**: Improved user experience and functionality
    *   Real-time bookmark status tracking in search results
    *   Enhanced action panel with bookmark and citation options
    *   Better visual indicators for PDF availability and bookmark status
*   **Code Organization**: Significant refactoring for maintainability
    *   Separated bookmark utilities into dedicated module
    *   Modular BibTeX generation utility
    *   Improved component structure and separation of concerns