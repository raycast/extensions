# 7TV Emotes Search

Search emotes from 7TV, BetterTTV, and FrankerFaceZ in Raycast. Copy or paste animated emotes as GIF files and static emotes as PNG files when available.

## Use

1. Open **Search Emotes**.
2. Choose a provider and sort order from the search dropdown.
3. Enter an emote name, or browse without a query.
4. Press Enter to drop the selected emote into the active app.

The dropdown includes Popular and Recent for all providers, daily Trending for 7TV, weekly Trending for BetterTTV, and alphabetical sorting for FrankerFaceZ. BetterTTV text search uses its search ranking. Its browse sorts return when you clear the query. 7TV alphabetical sorting is hidden because its API currently fails for that mode.

Scroll to load more results. 7TV and FrankerFaceZ show the loaded count and the API's matching total. This total depends on the current query and sort. BetterTTV shows the loaded count because its API does not provide a matching total.

Use the action menu to:

- Show animated emotes only with `Cmd+Shift+A`.
- Switch between grid and list with `Cmd+Shift+V`.
- Star an emote with `Cmd+S`.
- Copy an image file, URL, Markdown image, or ID.
- Paste a URL when the target app does not accept image files.

Favorites and recent history remain in Raycast's local storage. Entries saved before provider support are treated as 7TV emotes. Each provider shows its own saved entries.

## Development

Install Node.js 22.13 or later and Raycast. This checkout was verified with Node.js 26.7 on macOS.

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Run `npm run test:live` to check provider searches, pagination, and GIF downloads against the current services. This requires network access.

Clipboard support depends on the destination app. GIF copy and manual paste were tested in TextEdit on macOS. Direct paste into chat apps and Windows clipboard behavior still need testing.

The API layer uses native provider files. It does not require FFmpeg, ImageMagick, or API keys. Native 7TV GIF/PNG selection follows the approach in [n4kama's format fix](https://github.com/raycast/extensions/pull/32501). The provider comparison included [Emotecast](https://github.com/raycast/extensions/pull/30619). The Raycast extensions repository and these extensions declare the MIT license.
