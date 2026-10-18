# 7TV Emotes Search

Search emotes from 7TV, BetterTTV, and FrankerFaceZ in Raycast. Copy or paste animated emotes as GIF files and static emotes as PNG files when available.

## Use

1. Open **Search Emotes**.
2. Choose a provider and sort order from the search dropdown.
3. Enter an emote name, or browse without a query.
4. Press Enter to paste the selected emote file into the active app.

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

Clipboard support depends on the destination app. GIF copy and manual paste were verified in TextEdit on macOS. The maintainer also tested GIF pasting in chat apps. Windows clipboard behavior still needs testing.

The API layer uses native provider files. It does not require FFmpeg, ImageMagick, or API keys.

## Credits

- [n4kama / Nakama](https://github.com/n4kama) contributed native GIF/PNG selection in [#32501](https://github.com/raycast/extensions/pull/32501), following the earlier [Snag proposal](https://github.com/raycast/extensions/pull/30734). The GIF/PNG behavior comes from that contribution.
- [Kan-A-Pesh](https://github.com/Kan-A-Pesh) built [Emotecast](https://github.com/raycast/extensions/pull/30619). Its provider adapters and unified-provider workflow informed this expansion. This extension uses a separately implemented API layer and provider-native files rather than Emotecast's conversion pipeline.

The Raycast extensions repository and both contributions declare the MIT license.
