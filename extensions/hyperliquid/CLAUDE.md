# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for browsing Hyperliquid DEX perpetual markets. It is read-only: a single "Search Markets" command lists every perp market (including builder-deployed DEXs) with live price, 24h change, volume, and open interest, backed by Hyperliquid's public info API. No keys, no signing.

The command defaults to a master–detail layout (slim list of ticker + price on the left, a metadata pane on the right) and a search-bar dropdown that hides low-liquidity builder-DEX duplicates by default.

## Tech Stack

- **Raycast API**: UI framework and extension runtime
- **Hyperliquid public info API**: queried directly via `fetch` (no SDK) — see `src/utils/hyperliquid.ts`
- **TypeScript + React**

## Commands

- `npm run dev` - Development mode with hot reload (`ray develop`)
- `npm run build` - Build for production
- `npm run lint` / `npm run fix-lint` - Lint (validates manifest, metadata, ESLint, Prettier)
- `npm run publish` - Publish to the Raycast Store

## Architecture

Single command: `src/search-markets.tsx`.

- **Data**: `getMarkets()` fetches `perpDexs()` then `metaAndAssetCtxs()` per DEX in parallel (`Promise.allSettled`), flattens, and sorts by 24h volume. Builder-DEX assets are prefixed `dex:ASSET`; the full `name` (with prefix) is the unique key/URL/icon, while `baseName` (bare ticker) is the list title. Delisted and zero-price assets are dropped. `openInterest` from the API is in base-asset units and is converted to USD notional via mark price.
- **Client**: `src/utils/hyperliquid.ts` is a hand-rolled `fetch` wrapper (no SDK) over the public info endpoint (`/info`), exposing `getPerpDexs()` and `getMetaAndAssetCtxs(dex?)`. It POSTs `{ type, dex? }`, throws on non-2xx, and aborts after a 10s timeout. Network (mainnet/testnet) and the base URL come from the extension's only preference. Numeric response fields arrive as strings and are coerced at the call site (no runtime schema validation).
- **Layout**: master–detail is the default (`isShowingDetail` starts `true`); ⌘D toggles the dense multi-column table. The detail pane is metadata-only (no markdown header — title/price already sit in the left column) with a leading empty `Label` for top breathing room; the only color is green/red text on the 24h change. Includes hourly funding and annualized funding APR.
- **Search & filter**: native filtering stays on; the component tracks `searchText` only to re-order results by open interest while searching (input order is preserved by native filtering). A `searchBarAccessory` dropdown selects "Top Markets" (default — `topMarketNamesBySymbol()` keeps the highest-OI market per `baseName`, hiding builder-DEX duplicates) or "All Markets". Favorites bypass this filter.
- **Empty/error**: a `List.EmptyView` adapts its copy to API error vs. no search match vs. no data; `usePromise` also shows a failure toast.
- **Favorites**: stored as a market-name array under the `favorite-markets` LocalStorage key via `useLocalStorage`; favorited markets render in a pinned "Favorites" section and are excluded from the main section. Toggle action is ⌘⇧F.
- **Formatting**: prices use 5 significant figures capped at 2 decimals (sub-cent prices keep sig figs); other values use 1 decimal max.

### Column-alignment hacks (deliberate, do not "clean up")

Raycast has no grid/column API, so two workarounds keep the list readable:

1. `COLUMN_LEGEND` (`FAVORITES_LEGEND` / `PERPETUALS_LEGEND`): the `24h / Vol / OI` column labels are non-breaking-space-padded into the `List.Section` subtitle. The pad counts are eyeballed against the default window width. The legend only applies to the dense table, so both subtitles drop it while `showingDetail` is true; otherwise it sits on the Favorites section when favorites exist, else on the Perpetuals section.
2. `padColumn()`: every accessory value is left-padded with figure spaces (U+2007) to a fixed character width so columns line up across rows.

Both rely on invisible Unicode characters in string literals (`PAD`, `FIGURE_SPACE`) — preserve them when editing.

## Future Phases (v2 drafts)

Trading features (positions, orders, quick trade, account summary) are drafted in `~/RaycastExtensions/hyperliquid-v2/` along with the full trading-enabled client utilities (`hyperliquid-utils-full.ts`, `assets.ts`) and API research notes (`API_PREP.md`). They are intentionally excluded from the published extension.
