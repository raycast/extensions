# Caschys Blog

Read and search Caschys Blog from Raycast. The extension uses the public RSS feed at `stadt-bremerhaven.de`.

## Commands

- **Latest Articles** loads up to the configured limit, filters by category, searches the loaded set, and opens a cleaned article view.
- **Search Article Archive** queries the public WordPress search feed instead of limiting results to recently loaded posts.
- **Submit Tip** prepares an email draft for `tipp@stadt-bremerhaven.de`. The extension never sends it.
- **Open Caschys Blog** opens the website in the default browser.

## Raycast AI tools

- Search the public WordPress feed, including posts older than the local recent-article cache.
- Retrieve the latest articles.
- Prepare a tip email draft for review.

AI results contain cleaned feed excerpts. The assistant instructions require returned feed data and links, and tell the model not to invent missing article content.

Article results are cached for ten minutes. If a refresh fails, the extension keeps the last cached result available.

## Development

```bash
npm ci
npm test
npm run test:live
npm run check
```

`test:live` reads the public RSS and search feeds. It does not publish or modify blog content.

## License

MIT
