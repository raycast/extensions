# Google Scholar Search for Raycast

Quickly search and explore academic articles from Google Scholar directly within Raycast, with powerful bookmark management and AI tool integration.

## Features

### 🔍 **Search & Discovery**
*   **Comprehensive Search**: Utilize Google Scholar's advanced search operators directly from a Raycast form:
    *   Search by keywords, exact phrases, authors, publication, and date ranges.
    *   Specify word occurrence (anywhere or in the title).
*   **Detailed Results**: View search results with titles, authors, snippets, publication year, and citation counts.
*   **Direct Links**: Quickly open article pages or available PDF links in your browser.
*   **Pagination**: Load more search results beyond the initial page.
*   **Sorting**: Sort results by relevance or by date.

### ⭐ **Bookmark Management**
*   **Save Articles**: Bookmark articles with `⌘D` shortcut directly from search results.
*   **Dedicated Bookmarks View**: Access all saved articles via the "Show Bookmarks" command.
*   **Smart Organization**: Sort bookmarks by date saved, title, or publication year.
*   **Visual Indicators**: Star icons show bookmark status in search results.
*   **Bulk Management**: Clear all bookmarks with confirmation dialog.
*   **Persistent Storage**: Bookmarks are saved locally with complete article metadata.

### 👨‍🎓 **Author Profiles**
*   **Profile Links**: Direct access to author Google Scholar profiles.
*   **Quick Actions**: Open author profiles directly from search results and bookmarks.

### 📚 **Citations & Export**
*   **BibTeX Citations**: Easily copy BibTeX citations for your reference manager (`⌘⇧C`).
*   **Multiple Access Points**: Copy citations from both search results and bookmarks.
*   **Formatted Output**: Properly formatted BibTeX entries with all available metadata.

### 🤖 **AI Tools Integration**
*   **Programmatic Access**: Four AI tools for automated Google Scholar interactions:
    *   `search-scholar`: Search articles with structured parameters
    *   `getSavedBookmarks`: Retrieve all saved bookmarks
    *   `toggleArticleBookmark`: Add or remove bookmarks
    *   `checkIfArticleIsBookmarked`: Check bookmark status
*   **AI Assistant Support**: Use natural language to search and manage your academic research.

### ⚡ **Performance & Reliability**
*   **Caching**: Recently fetched results are cached to speed up repeated searches and reduce network requests.
*   **Robust Interaction**: Includes User-Agent rotation and smart retries to handle Google Scholar's rate limits gracefully.
*   **Error Handling**: Comprehensive error handling with user-friendly messages and retry mechanisms.

## Commands

### Search Articles
1. Trigger Raycast and type "Search Articles" or use the Google Scholar extension.
2. Fill in the search form with your desired parameters.
3. Browse results, bookmark articles, and access author profiles.

### Show Bookmarks
1. Type "Show Bookmarks" in Raycast to view all saved articles.
2. Sort bookmarks by various criteria using the dropdown menu.
3. Manage individual bookmarks or clear all at once.

## How to Use

### Searching for Articles
1.  Trigger Raycast and type the command name.
2.  Fill in the search form with your desired parameters.
    *   Use fields like "All Words", "Exact Phrase", "Authors", "Publication", "From Year", "To Year", etc.
    *   Choose where words should occur (anywhere in the article or in the title).
3.  Press `Enter` or click the "Search" action.
4.  Browse the list of search results.
    *   View details for each article.
    *   Use the Action Panel (`⌘K` or `Enter` on an item) to:
        *   Open the article link in your browser.
        *   Open the PDF link (if available).
        *   **Save/Remove bookmark** (`⌘D`).
        *   **Copy the BibTeX citation** (`⌘⇧C`).
        *   **Open author profiles** (Google Scholar).
5.  **Load More Results**: If more results are available, a "Load More Results" item will appear at the end of the list. Activate it to fetch the next page.
6.  **Sort Results**: Use the dropdown menu at the top right to sort by "Relevance" or "Date".

### Managing Bookmarks
1.  **Save Articles**: While viewing search results, press `⌘D` or use the "Save Bookmark" action on any article.
2.  **View Bookmarks**: Use the "Show Bookmarks" command to see all saved articles.
3.  **Sort Bookmarks**: Use the dropdown to sort by:
    *   Date Saved (newest/oldest first)
    *   Title (A-Z or Z-A)
    *   Year (newest/oldest first)
4.  **Remove Bookmarks**: Press `⌘D` or use the "Remove Bookmark" action from either search results or the bookmarks view.
5.  **Clear All**: Use the "Clear All Bookmarks" action (with confirmation) to remove all saved articles.

### Using AI Tools
The extension provides AI tools that can be used with AI assistants or programmatically:
*   Ask your AI assistant to search for specific articles
*   Request your bookmarked articles list
*   Add or remove bookmarks via natural language commands
*   Check if specific articles are already bookmarked

## For Developers

This extension is built using React and TypeScript with the Raycast API.

### Project Structure

*   `src/search-articles.tsx`: Main search command entry point with shared interfaces and utility functions.
*   `src/show-bookmarks.tsx`: Dedicated command for viewing and managing bookmarked articles.
*   `src/components/FormComponent.tsx`: Defines the search input form.
*   `src/components/SearchResultsComponent.tsx`: Handles fetching, displaying, and interacting with search results.
*   `src/utils/cache.ts`: Custom file-based caching mechanism.
*   `src/utils/parser.ts`: Logic for parsing HTML from Google Scholar search results.
*   `src/utils/userAgents.ts`: Provides a list of user agents for rotation.
*   `src/utils/bookmarks.ts`: Bookmark management functionality and storage.
*   `src/utils/bibtex.ts`: BibTeX citation generation utilities.
*   `src/tools/`: AI tools for programmatic access to extension functionality.
*   `assets/`: Contains extension icons and other static assets.
*   `package.json`: Defines dependencies, scripts, and extension metadata.

### AI Tools
The extension includes four AI tools for integration with AI assistants:
*   `search-scholar.ts`: Search Google Scholar with structured parameters
*   `getSavedBookmarks.ts`: Retrieve all saved bookmarked articles
*   `toggleArticleBookmark.ts`: Toggle bookmark status for articles
*   `checkIfArticleIsBookmarked.ts`: Check if an article is bookmarked

### Note on Rate Limiting

This extension makes requests directly to Google Scholar. While it includes features like User-Agent rotation and retries on rate limit errors (like HTTP 429), excessively frequent or rapid searches may lead to temporary blocking or CAPTCHA challenges from Google Scholar. The extension aims to handle these gracefully by informing the user.

---

Enjoy enhanced academic research productivity with Google Scholar in Raycast!