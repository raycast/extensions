# wikiHow for Raycast

Find English wikiHow articles, read indexed excerpts in a split view or a larger preview, then explicitly open the complete article on wikiHow.

## What's new

- Works **without an API key**: searches open on wikiHow.com, and a key unlocks in-Raycast previews.
- **Recently Viewed** articles appear when the search bar is empty.
- Copy any article as a Markdown link.

This is an unofficial extension by **itsdanielsultan**. Search uses the supported **Brave Web Search API** with your personal key. Previews are search excerpts, not complete article steps. This package does not use a wikiHow API or scrape article pages.

## Setup

1. Obtain a personal **Web Search API key** from the [Brave Search API dashboard](https://api-dashboard.search.brave.com/).
2. Run **wikiHow → Search Articles** and choose **Set API Key**.
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
- Search results are held in memory for the current command. There is no persistent result cache, search history, article scraping, or AI tool.
- Opening an article is an explicit user action that uses the normal browser. Images and full article content are not fetched by the extension.
- wikiHow’s [robots policy](https://www.wikihow.com/robots.txt) and the failed direct search endpoint were reviewed before choosing this supported search-provider route. Full article previews would require a supported licensed source from wikiHow.

## Development

Requires Node.js 22.22.2 or later and an installed Raycast app for live UI verification.

```sh
npm install
npm run test
npm run build
npm run typecheck
npm run lint
npm run dev
```

`npm run test:live` checks the official endpoint’s response without credentials. The authenticated test is skipped unless `BRAVE_SEARCH_API_KEY` is set in the process environment. It does not print or save live excerpts or the key.

## Sources

- [Brave Web Search request and response contract](https://api-dashboard.search.brave.com/api-reference/web/search/get)
- [Brave search operators and site scoping](https://api-dashboard.search.brave.com/documentation/resources/search-operators)
- [Raycast List API](https://developers.raycast.com/api-reference/user-interface/list)
- [Raycast Detail API](https://developers.raycast.com/api-reference/user-interface/detail)
- [Existing Wikipedia extension source used as interaction reference](https://github.com/raycast/extensions/tree/main/extensions/wikipedia)

The Raycast extension tree was inspected on October 10, 2026: 3,402 extension directories, no existing wikiHow-named package. The Wikipedia package covers Wikipedia’s API and is a useful search/preview reference; this package serves wikiHow discovery through a different supported integration.

## License

MIT for this extension’s code and original icon. wikiHow content and Brave services retain their respective rights.
