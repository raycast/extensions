// Wallet Balance Response (from /sapi/v1/asset/wallet/balance)
export interface WalletBalanceItem {
  activate: boolean;
  balance: string;
  walletName: string;
}

// Wallet Types
export type WalletType = "spot" | "cross-margin" | "isolated-margin" | "usdm-futures" | "coinm-futures";

export interface WalletOption {
  id: WalletType;
  name: string;
}

// Unified Asset Interface (for display)
export interface WalletAsset {
  asset: string;
  free: string;
  locked: string;
  borrowed?: string;
  interest?: string;
  netAsset?: string;
  unrealizedPnl?: string;
  walletBalance?: string;
  marginBalance?: string;
  availableBalance?: string;
}

export interface WalletSummary {
  totalBalanceUsd: string;
  totalBalanceBtc?: string;
  unrealizedPnl?: string;
  unrealizedPnlRaw?: string; // Raw PnL in crypto (for COIN-M)
  marginLevel?: string;
}

// Unified Position Interface (for display)
export interface WalletPosition {
  symbol: string;
  size: string;
  notional?: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  liquidationPrice: string;
  unrealizedPnl: string;
  leverage: string;
  positionSide: string;
  marginType: "cross" | "isolated";
  roe?: string;
  margin?: string;
  maintMargin?: string;
  marginRatio?: string;
}

// Margin Position Interface (for Cross/Isolated Margin)
export interface MarginPosition {
  symbol?: string; // For isolated margin (pair name)
  pair?: string; // For isolated margin (pair name, e.g., "BTCUSDT")
  asset: string;
  position: string; // netAsset
  positionValue: string; // in USD
  indexPrice: string;
  marginLevel?: string; // For isolated margin (per-pair margin level)
}

// Isolated Margin Pair Position (groups both assets of a pair)
export interface IsolatedMarginPairPosition {
  pair: string; // e.g., "BTCUSDT"
  baseAsset: {
    asset: string;
    netAsset: string;
    positionValue: string;
  };
  quoteAsset: {
    asset: string;
    netAsset: string;
    positionValue: string;
  };
  indexPrice: string;
  liquidationPrice: string;
  marginLevel: string;
}

// Spot Account Response
export interface SpotAccountResponse {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: SpotBalance[];
}

export interface SpotBalance {
  asset: string;
  free: string;
  locked: string;
}

// Cross Margin Account Response
export interface MarginAccountResponse {
  borrowEnabled: boolean;
  marginLevel: string;
  collateralMarginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  TotalCollateralValueInUSDT: string;
  tradeEnabled: boolean;
  transferInEnabled: boolean;
  transferOutEnabled: boolean;
  accountType: string;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  free: string;
  locked: string;
  borrowed: string;
  interest: string;
  netAsset: string;
}

// Isolated Margin Account Response
export interface IsolatedMarginAccountResponse {
  assets: IsolatedMarginPair[];
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
}

export interface IsolatedMarginPair {
  baseAsset: IsolatedMarginAssetInfo;
  quoteAsset: IsolatedMarginAssetInfo;
  symbol: string;
  isolatedCreated: boolean;
  enabled: boolean;
  marginLevel: string;
  marginLevelStatus: string;
  marginRatio: string;
  indexPrice: string;
  liquidatePrice: string;
  liquidateRate: string;
  tradeEnabled: boolean;
}

export interface IsolatedMarginAssetInfo {
  asset: string;
  borrowEnabled: boolean;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
  netAssetOfBtc: string;
  repayEnabled: boolean;
  totalAsset: string;
}

// USD-M Futures Account Response
export interface UsdmFuturesAccountResponse {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  totalInitialMargin: string;
  totalMaintMargin: string;
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  totalCrossWalletBalance: string;
  totalCrossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  assets: UsdmFuturesAsset[];
  positions: UsdmFuturesPosition[];
}

export interface UsdmFuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  maintMargin: string;
  initialMargin: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
}

export interface UsdmFuturesPosition {
  symbol: string;
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  breakEvenPrice: string;
  maxNotional: string;
  positionSide: string;
  positionAmt: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
  bidNotional: string;
  askNotional: string;
}

// USD-M Futures Position Risk Response (for mark price)
export interface UsdmPositionRisk {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

// COIN-M Futures Position Risk Response (for mark price)
export interface CoinmPositionRisk {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxQty: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notionalValue: string;
  isolatedWallet: string;
  updateTime: number;
}

// COIN-M Futures Account Response
export interface CoinmFuturesAccountResponse {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  assets: CoinmFuturesAsset[];
  positions: CoinmFuturesPosition[];
}

export interface CoinmFuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  maintMargin: string;
  initialMargin: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  updateTime: number;
}

export interface CoinmFuturesPosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unrealizedProfit: string;
  unRealizedProfit?: string; // Alternative field name
  liquidationPrice: string;
  leverage: string;
  maxQty: string;
  marginType?: string;
  isolated: boolean | string; // true for isolated margin, false for cross
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notionalValue: string;
  isolatedWallet: string;
  initialMargin: string;
  maintMargin: string;
  positionInitialMargin: string;
  updateTime: number;
}

// API Error Response
export interface BinanceApiError {
  code: number;
  msg: string;
}

// Ticker Price Response
export interface TickerPrice {
  symbol: string;
  price: string;
}

// 24hr Ticker Response
export interface Ticker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
  // Calculated field: quote volume converted to USD
  quoteVolumeUsd?: number;
  // Calculated field: price precision (decimal places)
  pricePrecision?: number;
}

// Sort Criteria for Market Prices
export type SortCriteria = "volume" | "gainers" | "losers";

// Isolated Margin Asset (extends WalletAsset with pair symbol)
export interface IsolatedMarginWalletAsset extends WalletAsset {
  symbol: string; // The trading pair (e.g., "BTCUSDT")
}

// ============ Type Guards ============

/**
 * Type guard to check if a MarginPosition has a 'pair' property,
 * indicating it's an isolated margin position.
 */
export function hasPair(position: MarginPosition): position is MarginPosition & { pair: string } {
  return typeof position.pair === "string" && position.pair.length > 0;
}
