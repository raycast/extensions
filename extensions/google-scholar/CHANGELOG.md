# Changelog

## [2.0.1] - 2025-06-16

Add new images for metadata and remove old ones

## [2.0.0] - 2025-06-12

### 🚨 BREAKING CHANGES - Major Redesign for Compliance

This version represents a complete architectural overhaul to ensure long-term sustainability and compliance with Google Scholar's Terms of Service.

### ✅ Added
- **Smart conditional year filtering** - Year range fields only appear when sorting by relevance
- **Enhanced search validation** - Better error messages and form validation
- **Improved search history** - Cleaner display of recent searches with better formatting

### 🔄 Changed
- **Complete removal of web scraping** - Now uses official Google Scholar URLs instead of parsing HTML
- **Browser-based results** - Opens searches directly in browser for full Google Scholar experience
- **Simplified architecture** - Removed complex bookmark management system
- **Streamlined interface** - Focus on core search functionality
- **Improved UX logic** - Year filtering disabled when sorting by newest (eliminates logical conflicts)

### 🗑️ Removed
- **Web scraping dependencies** - Removed axios, cheerio, and HTML parsing
- **Bookmark system** - Removed complex research management features
- **AI tools integration** - Removed automated article processing
- **Local article storage** - No longer stores or caches article data
- **Advanced metadata tracking** - Simplified to core search functionality

### 🛡️ Security & Compliance
- **Terms of Service compliance** - No longer violates Google Scholar's ToS
- **Anti-scraping resilience** - Immune to Google's bot detection measures
- **Privacy improvements** - No external API calls or data collection
- **Sustainable operation** - Uses Google Scholar's intended access methods

### 📈 Performance
- **Faster startup** - Removed heavy dependencies and processing
- **Instant search** - Direct URL construction without API delays
- **Reduced resource usage** - No background processing or data storage
- **Better reliability** - No network timeouts or parsing errors

### 🎯 Why This Change?

**The Problem:** The previous version used web scraping to extract search results from Google Scholar, which:
- Violated Google Scholar's Terms of Service
- Was blocked by Google's anti-scraping measures
- Required constant maintenance due to HTML structure changes

- Provided an unreliable user experience

**The Solution:** This version takes a compliance-first approach:
- Uses Google Scholar's official search parameters
- Opens results in the user's browser for full functionality
- Respects Google's intended usage patterns
- Provides a sustainable, future-proof solution
- Maintains excellent usability while ensuring compliance

### 🔄 Migration Notes

**For users upgrading from v1.0:**
- Previous bookmarks and saved articles are no longer accessible
- Search functionality is now browser-based instead of in-app
- Recent search history will be reset
- No data migration is possible due to architectural changes

**Recommended workflow:**
1. Use the extension to construct advanced searches
2. Review results in Google Scholar (full features available)
3. Bookmark articles using your browser's bookmark system
4. Use Google Scholar's "My Library" for research management


## [1.0.0] - 2025-05-30 DEPRECATED

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