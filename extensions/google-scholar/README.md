# Google Scholar Search for Raycast

Quickly search and explore academic articles from Google Scholar directly within Raycast.

## Features

*   **Comprehensive Search**: Utilize Google Scholar's advanced search operators directly from a Raycast form:
    *   Search by keywords, exact phrases, authors, publication, and date ranges.
    *   Specify word occurrence (anywhere or in the title).
*   **Detailed Results**: View search results with titles, authors, snippets, publication year, and citation counts.
*   **Direct Links**: Quickly open article pages or available PDF links in your browser.
*   **Pagination**: Load more search results beyond the initial page.
*   **Sorting**: Sort results by relevance or by date.
*   **Copy Citations**: Easily copy BibTeX citations for your reference manager.
*   **Caching**: Recently fetched results are cached to speed up repeated searches and reduce network requests.
*   **Robust Interaction**: Includes User-Agent rotation and smart retries to handle Google Scholar's rate limits gracefully.

## How to Use

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
        *   Copy the BibTeX citation (`⌘⇧C`).
5.  **Load More Results**: If more results are available, a "Load More Results" item will appear at the end of the list. Activate it to fetch the next page.
6.  **Sort Results**: Use the dropdown menu at the top right of the search results list to sort by "Relevance" or "Date".
7.  **Clear Cache**: You can clear the extension's cache using the "Clear Cache" option in the dropdown menu in the search results list, or via an action in the initial search form.

## For Developers

This extension is built using React and TypeScript with the Raycast API.

### Project Structure

*   `src/search-articles.tsx`: Main command entry point, exports shared interfaces and utility functions.
*   `src/components/FormComponent.tsx`: Defines the search input form.
*   `src/components/SearchResultsComponent.tsx`: Handles fetching, displaying, and interacting with search results.
*   `src/utils/cache.ts`: Custom file-based caching mechanism.
*   `src/utils/parser.ts`: Logic for parsing HTML from Google Scholar search results.
*   `src/utils/userAgents.ts`: Provides a list of user agents for rotation.
*   `assets/`: Contains extension icons and other static assets.
*   `package.json`: Defines dependencies, scripts, and extension metadata.

### Note on Rate Limiting

This extension makes requests directly to Google Scholar. While it includes features like User-Agent rotation and retries on rate limit errors (like HTTP 429), excessively frequent or rapid searches may lead to temporary blocking or CAPTCHA challenges from Google Scholar. The extension aims to handle these gracefully by informing the user.

---

Enjoy enhanced academic research productivity with Google Scholar in Raycast!