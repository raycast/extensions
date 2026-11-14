# wikiHow for Raycast

Find English wikiHow articles, read indexed excerpts in a split view or a larger preview, then explicitly open the complete article on wikiHow.

This is an unofficial extension by **itsdanielsultan**. Search uses the supported **Brave Web Search API** with your personal key. Previews are search excerpts, not complete article steps. This package does not use a wikiHow API or scrape article pages.

## Commands

- **Search Articles** finds English wikiHow articles. With a Brave Search API key, results, excerpts and previews appear in Raycast; without one, the search opens on wikiHow.com. Recently viewed articles appear when the search bar is empty, and any article can be copied as a Markdown link.
- **Random Article** opens a random article with wikiHow's own randomizer.

## Setup

1. Obtain a personal **Web Search API key** from the [Brave Search API dashboard](https://api-dashboard.search.brave.com/).
2. Run **wikiHow → Search Articles** and choose **Add API Key**.
3. Save the key in **Brave Search API Key** in extension preferences.
4. Enter a topic such as `tie a tie`.

Requests use your Brave API allowance. Availability and charges depend on your API plan; this extension does not sign you up or purchase a plan. Use of the API and its results is subject to [Brave’s terms](https://api-dashboard.search.brave.com/terms-of-service).

## Actions

| Action                       | Behavior                                            |
| ---------------------------- | --------------------------------------------------- |
| Read Excerpts                | Opens a readable preview inside Raycast             |
| Open on wikiHow              | Opens the selected full article in your browser     |
| Copy Article Link            | Copies the canonical article URL                    |
| Next / Previous Results Page | Fetches another page, up to Brave’s ten-page limit  |
| Retry Search                 | Retries the query; rate-limit cooldowns still apply |

Searches are debounced. The extension requests up to 20 results per page, removes duplicates and non-article URLs, and uses only English wikiHow article destinations. Empty results and API authentication, quota, network, and response errors have distinct explanations. Cancelling or changing a search prevents its old response from appearing.

## Data and access

- Your query and API key are sent to `api.search.brave.com` over HTTPS; the key is sent in a header.
- The API key is a Raycast password preference and is never included in article URLs or copied by an action.
- Search results are cached locally by Raycast so repeat searches appear instantly. Up to 25 articles you open or preview are saved locally as **Recently Viewed** (title, link and search excerpt). Remove one with **Remove from Recent** or all with **Clear Recent Articles**. There is no article scraping or AI tool.
- Opening an article is an explicit user action that uses the normal browser. Images and full article content are not fetched by the extension.
- Results come from Brave Search rather than wikiHow directly, which respects wikiHow’s [robots policy](https://www.wikihow.com/robots.txt). Full article previews would require a supported licensed source from wikiHow.

## Sources

- [Brave Web Search request and response contract](https://api-dashboard.search.brave.com/api-reference/web/search/get)
- [Brave search operators and site scoping](https://api-dashboard.search.brave.com/documentation/resources/search-operators)
- [Raycast List API](https://developers.raycast.com/api-reference/user-interface/list)
- [Raycast Detail API](https://developers.raycast.com/api-reference/user-interface/detail)
- [Existing Wikipedia extension source used as interaction reference](https://github.com/raycast/extensions/tree/main/extensions/wikipedia)


## License

MIT for this extension’s code and original icon. wikiHow content and Brave services retain their respective rights.
