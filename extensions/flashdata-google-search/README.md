# FlashData Google Search

Search Google from Raycast and browse titles, source URLs, snippets, and ranking positions. Copy the complete JSON response or a Markdown source list for research and AI agent workflows.

## Set up

1. Sign in to [FlashData](https://flashdata.dev/) and create an API key with **Google Search** access.
2. Make sure your FlashData account has sufficient Credits. See the [Google Search API reference](https://flashdata.dev/docs/sources/google_search) for current usage information.
3. Enter your own key in the extension's required **FlashData API Key** preference.
4. Open **Search Google**, enter a query, and submit the form.

No API key, free search allowance, or shared account is included. The normal search command does not use Raycast AI and does not require Raycast Pro.

## Using the results

- Country and language codes are optional. For example, use `us` and `en`.
- Result count and page must be whole numbers from 1 to 100. Actual results may be fewer than requested.
- Open a source in your browser, copy its URL or snippet, or copy all results as JSON or Markdown.
- Filtering the returned list is local. To run another query or request another page, choose **Edit Search** and submit again.
- Search snippets are not full page text. Open the sources to verify information and obtain full content.

## Billing and privacy

Each submitted query/page sends one request directly to `https://data.flashdata.dev/v1/queries/realtime`, using your own `X-API-Key`, and consumes Credits from your FlashData account. This extension does not sell a separate subscription. Creating a query on the form, opening the command, and filtering results do not call the API.

The extension does not retry automatically. A timeout or connection failure does not guarantee cancellation; check your FlashData query history before retrying to avoid duplicate usage.

Your key is entered through Raycast's password preference. The extension sends your key, query, and selected search parameters only to the FlashData API. It does not include analytics, log your key, or save query history. **Open in Browser** opens the selected source website; clipboard actions copy only when chosen.

- [FlashData](https://flashdata.dev/)
- [API reference](https://flashdata.dev/docs/sources/google_search)
- [Terms of service](https://flashdata.dev/legal/terms)

## Development

Use `npm install`, `npm run build`, and `npm run lint`. `npm test` uses mocked HTTP responses and documented fixtures; it never performs a paid search. Run the distribution build in Raycast before submitting a Store PR. Publish with `npm run publish`, not `npm publish`.
