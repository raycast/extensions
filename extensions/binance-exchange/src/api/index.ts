// Re-export all API modules

// Client utilities
export {
  authenticatedRequest,
  COINM_FUTURES_BASE_URL,
  publicRequest,
  SPOT_BASE_URL,
  USDM_FUTURES_BASE_URL,
} from "./client";

// Market data
export {
  fetchAllTickers,
  getAssetPrecision,
  getAssetPrecisionSync,
  getPricePrecisionSync,
  getQuoteAssetSync,
  getTickerPrices,
} from "./market";

// Portfolio & calculations
export { calculateUsdValue, getTotalPortfolioBalance, getWalletBalances } from "./portfolio";

// Spot wallet
export { getSpotAccount, getSpotWalletData } from "./wallet-spot";

// Margin wallets
export {
  getIsolatedMarginAccount,
  getIsolatedMarginWalletData,
  getMarginAccount,
  getMarginWalletData,
} from "./wallet-margin";

// Margin wallet types
export type { IsolatedMarginPairPosition, IsolatedMarginPosition, IsolatedMarginWalletAsset } from "./wallet-margin";

// Futures wallets
export {
  getCoinmFuturesAccount,
  getCoinmFuturesWalletData,
  getCoinmPositionRisk,
  getUsdmFuturesAccount,
  getUsdmFuturesWalletData,
  getUsdmPositionRisk,
} from "./wallet-futures";
