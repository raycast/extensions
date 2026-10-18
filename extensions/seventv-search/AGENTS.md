# Extension development

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` before handing off changes. `npm run dev` installs a development build in Raycast. Stop the development watcher with Ctrl+C.

`src/providers.ts` owns API requests, provider-specific pagination, and native file selection. `src/search.tsx` owns Raycast UI, clipboard actions, favorites, and history.

Keep the extension name `seventv-search`, the `search` command, and `favorites_v1` / `history_v1` storage keys stable. A saved emote without a provider is from 7TV. Use provider-qualified identities for new favorites and history entries.

7TV and FrankerFaceZ use page numbers. BetterTTV browse uses a `before` cursor, while BetterTTV text search uses numeric offsets. Do not infer a BetterTTV total from loaded results. 7TV alphabetical sorting currently returns LOAD_ERROR and must remain hidden until verified live.

Preserve unrelated changes. Do not commit credentials, dependencies, downloaded emotes, or user media. Keep clipboard runtime checks distinct from HTTP and unit tests.
