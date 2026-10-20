# Extension development

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` before handing off changes. `npm run dev` installs a development build in Raycast. Stop the development watcher with Ctrl+C.

`src/providers.ts` owns API requests, provider-specific pagination, and native file selection. `src/search.tsx` owns Raycast UI and clipboard actions. `src/saved-emotes.ts` loads and saves favorites and history. It waits for the initial load and serializes writes. Never clear unreadable saved data automatically.

Keep the extension name `seventv-search`, the `search` command, and `favorites_v1` / `history_v1` storage keys stable. A saved emote without a provider is from 7TV. Use provider-qualified identities for new favorites and history entries.

7TV and FrankerFaceZ use page numbers. BetterTTV browse uses a `before` cursor, while BetterTTV text search uses numeric offsets. Do not infer a BetterTTV total from loaded results. 7TV alphabetical sorting currently returns LOAD_ERROR and must remain hidden until verified live.

Preserve unrelated changes. Do not commit credentials, dependencies, downloaded emotes, or user media. Keep clipboard runtime checks distinct from HTTP and unit tests.

`src/search-state.ts` matches saved emote names and persists view preferences under `search_preferences_v1`. Restore preferences before requesting provider results. Validate provider/sort combinations against exposed options. Keep search text out of storage, queue preference writes, and leave unreadable preferences untouched. Saved search must work in grid and list views, including when the provider returns no results.

Local follow-up work is based on n4kama's #32566. Keep their commits and `nakama` contributor entry. #32566 has merged. Do not push or open a PR without the maintainer's approval. The README now acknowledges their original GIF/PNG work; this correction is local until an approved update publishes it.

`src/user-emotes.ts` owns anonymous 7TV user lookup, active channel sets, creator metadata, and personal-set status. Empty channel queries must use null. Fetch creator image details in batches of at most 10 to respect query complexity. Explicit reload invalidates creator metadata. Do not present unfiltered channel totals as public matching counts. Exclude private/unlisted entries. Personal-set approval does not establish general reuse permission. `src/user-browser.tsx` opens the shared emote browser; keep its clipboard and size actions unchanged.
