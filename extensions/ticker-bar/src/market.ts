// Stable public surface for command UIs. Implementation details live in
// focused modules so adding a provider does not change every consumer.
export { formatMenuTitle, formatPercent, formatPrice } from "./market-format";
export { assetFromId, normalizeAssetId, parseWatchlist } from "./market-ids";
export { refreshMenuBar, refreshQuotes } from "./market-refresh";
export {
  addToWatchlist,
  DEFAULT_WATCHLIST,
  getCachedQuotes,
  getLogoDisplay,
  getMenuBarStyle,
  getPrimaryAssetId,
  getQuoteStatuses,
  getWatchlist,
  MAX_WATCHLIST_SIZE,
  moveWatchlistItem,
  removeFromWatchlist,
  resetWatchlistToDefaults,
  setPrimaryAssetId,
  setLogoDisplay,
  setMenuBarStyle,
  setWatchlist,
} from "./market-storage";
export type {
  Asset,
  AssetKind,
  LogoDisplay,
  MenuBarStyle,
  Quote,
  QuoteStatus,
  RefreshFailure,
  RefreshReport,
  SearchResult,
} from "./market-types";
export { fetchQuote, popularMarkets, searchMarkets } from "./providers";
