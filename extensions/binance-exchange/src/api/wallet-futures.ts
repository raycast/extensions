import {
  CoinmFuturesAccountResponse,
  CoinmPositionRisk,
  UsdmFuturesAccountResponse,
  UsdmPositionRisk,
  WalletAsset,
  WalletPosition,
  WalletSummary,
} from "../types";
import { authenticatedRequest, COINM_FUTURES_BASE_URL, USDM_FUTURES_BASE_URL } from "./client";
import { getTickerPrices } from "./market";
import { calculateUsdValue } from "./portfolio";

// ============ USD-M Futures ============

/**
 * Get USD-M futures account information
 */
export async function getUsdmFuturesAccount(): Promise<UsdmFuturesAccountResponse> {
  return authenticatedRequest<UsdmFuturesAccountResponse>(USDM_FUTURES_BASE_URL, "/fapi/v2/account");
}

/**
 * Get USD-M futures position risk
 */
export async function getUsdmPositionRisk(): Promise<UsdmPositionRisk[]> {
  return authenticatedRequest<UsdmPositionRisk[]>(USDM_FUTURES_BASE_URL, "/fapi/v2/positionRisk");
}

/**
 * Get USD-M futures wallet data with assets, positions, and summary
 */
export async function getUsdmFuturesWalletData(existingPrices?: Map<string, number>): Promise<{
  assets: WalletAsset[];
  positions: WalletPosition[];
  summary: WalletSummary;
}> {
  const [account, prices, positionRisk] = await Promise.all([
    getUsdmFuturesAccount(),
    existingPrices ?? getTickerPrices(),
    getUsdmPositionRisk(),
  ]);

  // Create maps of symbol+positionSide to mark price, liquidation price, and isolated wallet from positionRisk
  const markPriceMap = new Map<string, string>();
  const liquidationPriceMap = new Map<string, string>();
  const isolatedWalletMap = new Map<string, string>();
  for (const risk of positionRisk) {
    const key = `${risk.symbol}_${risk.positionSide}`;
    markPriceMap.set(key, risk.markPrice);
    liquidationPriceMap.set(key, risk.liquidationPrice);
    isolatedWalletMap.set(key, risk.isolatedWallet);
  }

  const assets: WalletAsset[] = [];
  const positions: WalletPosition[] = [];

  for (const asset of account.assets) {
    const walletBalance = parseFloat(asset.walletBalance);
    const marginBalance = parseFloat(asset.marginBalance);

    if (walletBalance > 0 || marginBalance > 0) {
      assets.push({
        asset: asset.asset,
        free: asset.availableBalance,
        locked: "0",
        walletBalance: asset.walletBalance,
        marginBalance: asset.marginBalance,
        availableBalance: asset.availableBalance,
        unrealizedPnl: asset.unrealizedProfit,
      });
    }
  }

  // Calculate account-level margin ratio for cross positions
  const totalMaintMargin = parseFloat(account.totalMaintMargin);
  const totalMarginBalance = parseFloat(account.totalMarginBalance);
  const accountMarginRatio = totalMarginBalance > 0 ? (totalMaintMargin / totalMarginBalance) * 100 : 0;

  // Get open positions (positionAmt != 0)
  for (const position of account.positions) {
    const positionAmt = parseFloat(position.positionAmt);
    if (positionAmt !== 0) {
      const unrealizedProfit = parseFloat(position.unrealizedProfit);
      const initialMargin = parseFloat(position.positionInitialMargin);
      const roe = initialMargin > 0 ? (unrealizedProfit / initialMargin) * 100 : 0;
      const positionKey = `${position.symbol}_${position.positionSide}`;
      const markPrice = markPriceMap.get(positionKey) || position.breakEvenPrice;
      const liquidationPrice = liquidationPriceMap.get(positionKey) || "0";
      // For isolated positions, use isolatedWallet (fixed margin); for cross, use positionInitialMargin
      const margin = position.isolated
        ? isolatedWalletMap.get(positionKey) || position.isolatedWallet
        : position.positionInitialMargin;

      // Calculate margin ratio:
      // For Cross: use account-level margin ratio (totalMaintMargin / totalMarginBalance)
      // For Isolated: use position-level (maintMargin / (isolatedWallet + unrealizedPnl))
      let marginRatio = 0;
      if (position.isolated) {
        const isolatedWallet = parseFloat(isolatedWalletMap.get(positionKey) || position.isolatedWallet || "0");
        const isolatedMarginBalance = isolatedWallet + unrealizedProfit;
        const maintMargin = parseFloat(position.maintMargin || "0");
        marginRatio = isolatedMarginBalance > 0 ? (maintMargin / isolatedMarginBalance) * 100 : 0;
      } else {
        marginRatio = accountMarginRatio;
      }

      positions.push({
        symbol: position.symbol,
        size: position.positionAmt,
        notional: position.notional,
        entryPrice: position.entryPrice,
        breakEvenPrice: position.breakEvenPrice,
        markPrice: markPrice,
        liquidationPrice: liquidationPrice,
        unrealizedPnl: position.unrealizedProfit,
        leverage: position.leverage,
        positionSide: position.positionSide,
        marginType: position.isolated ? "isolated" : "cross",
        roe: roe.toFixed(2),
        margin: margin,
        maintMargin: position.maintMargin,
        marginRatio: marginRatio.toFixed(2),
      });
    }
  }

  // Sort by margin balance
  assets.sort((a, b) => parseFloat(b.marginBalance || "0") - parseFloat(a.marginBalance || "0"));

  // Calculate BTC equivalent
  const btcPrice = prices.get("BTCUSDT") || prices.get("BTCBUSD") || 1;
  const totalUsd = parseFloat(account.totalMarginBalance);
  const totalBtc = totalUsd / btcPrice;

  return {
    assets,
    positions,
    summary: {
      totalBalanceUsd: totalUsd.toFixed(2),
      totalBalanceBtc: totalBtc.toFixed(8),
      unrealizedPnl: parseFloat(account.totalUnrealizedProfit).toFixed(4),
    },
  };
}

// ============ COIN-M Futures ============

/**
 * Get COIN-M futures account information
 */
export async function getCoinmFuturesAccount(): Promise<CoinmFuturesAccountResponse> {
  return authenticatedRequest<CoinmFuturesAccountResponse>(COINM_FUTURES_BASE_URL, "/dapi/v1/account");
}

/**
 * Get COIN-M futures position risk
 */
export async function getCoinmPositionRisk(): Promise<CoinmPositionRisk[]> {
  return authenticatedRequest<CoinmPositionRisk[]>(COINM_FUTURES_BASE_URL, "/dapi/v1/positionRisk");
}

/**
 * Get COIN-M futures wallet data with assets, positions, and summary
 */
export async function getCoinmFuturesWalletData(existingPrices?: Map<string, number>): Promise<{
  assets: WalletAsset[];
  positions: WalletPosition[];
  summary: WalletSummary;
}> {
  const [account, prices, positionRisk] = await Promise.all([
    getCoinmFuturesAccount(),
    existingPrices ?? getTickerPrices(),
    getCoinmPositionRisk(),
  ]);

  // Create maps of symbol+positionSide to mark price, liquidation price, and isolated wallet from positionRisk
  const markPriceMap = new Map<string, string>();
  const liquidationPriceMap = new Map<string, string>();
  const isolatedWalletMap = new Map<string, string>();
  for (const risk of positionRisk) {
    const key = `${risk.symbol}_${risk.positionSide}`;
    markPriceMap.set(key, risk.markPrice);
    liquidationPriceMap.set(key, risk.liquidationPrice);
    isolatedWalletMap.set(key, risk.isolatedWallet);
  }

  let totalUsd = 0;
  let totalUnrealizedPnlUsd = 0;
  let totalUnrealizedPnlBtc = 0; // Track total PnL in BTC equivalent for COIN-M
  const assets: WalletAsset[] = [];
  const positions: WalletPosition[] = [];

  // Create map of asset to marginBalance for per-asset margin ratio calculation
  const assetMarginBalanceMap = new Map<string, number>();

  // Get BTC price for conversion
  const btcPrice = prices.get("BTCUSDT") || prices.get("BTCBUSD") || 1;

  for (const asset of account.assets) {
    const walletBalance = parseFloat(asset.walletBalance);
    const marginBalance = parseFloat(asset.marginBalance);
    const unrealizedProfit = parseFloat(asset.unrealizedProfit || "0");

    // Store margin balance per asset for position-specific margin ratio calculation
    assetMarginBalanceMap.set(asset.asset, marginBalance);

    if (walletBalance > 0 || marginBalance > 0) {
      const usdValue = calculateUsdValue(asset.asset, marginBalance, prices);
      totalUsd += usdValue;

      // Calculate unrealized PnL in USD
      const unrealizedPnlUsd = calculateUsdValue(asset.asset, unrealizedProfit, prices);
      totalUnrealizedPnlUsd += unrealizedPnlUsd;

      // Convert unrealized PnL to BTC equivalent
      totalUnrealizedPnlBtc += unrealizedPnlUsd / btcPrice;

      assets.push({
        asset: asset.asset,
        free: asset.availableBalance,
        locked: "0",
        walletBalance: asset.walletBalance,
        marginBalance: asset.marginBalance,
        availableBalance: asset.availableBalance,
        unrealizedPnl: asset.unrealizedProfit,
      });
    }
  }

  // Get open positions (positionAmt != 0)
  for (const position of account.positions) {
    const positionAmt = parseFloat(position.positionAmt);
    if (positionAmt !== 0) {
      const unrealizedProfit = parseFloat(position.unrealizedProfit || position.unRealizedProfit || "0");
      const leverage = parseFloat(position.leverage || "1");
      const entryPrice = parseFloat(position.entryPrice || "0");
      // COIN-M uses "isolated" boolean field, not "marginType" string
      const isIsolated = position.isolated === true || position.isolated === "true";

      // For COIN-M: ROE = (unrealizedProfit / initialMargin) * 100
      // Use the initialMargin field from API, or calculate from entry price
      let initialMargin = 0;
      const apiInitialMargin = parseFloat(position.initialMargin || position.positionInitialMargin || "0");

      if (apiInitialMargin > 0) {
        initialMargin = apiInitialMargin;
      } else if (entryPrice > 0) {
        // Fallback: estimate initial margin from entry price
        // COIN-M contract value = positionAmt * contractMultiplier / entryPrice
        // For BTCUSD: 1 contract = 100 USD, so margin = (positionAmt * 100 / entryPrice) / leverage
        const contractMultiplier = 100; // Standard for BTCUSD perpetual
        initialMargin = (Math.abs(positionAmt) * contractMultiplier) / entryPrice / leverage;
      }

      const roe = initialMargin > 0 ? (unrealizedProfit / initialMargin) * 100 : 0;
      const positionKey = `${position.symbol}_${position.positionSide}`;
      // For isolated positions, use isolatedWallet (fixed margin); for cross, use initialMargin
      const margin = isIsolated
        ? isolatedWalletMap.get(positionKey) || position.isolatedWallet || "0"
        : position.initialMargin || position.positionInitialMargin || "0";

      // Calculate margin ratio:
      // For Cross COIN-M: use asset-specific margin ratio (position maintMargin / asset marginBalance)
      // For Isolated: use position-level (maintMargin / (isolatedWallet + unrealizedPnl))
      // COIN-M positions are collateralized by a specific asset (e.g., ETH for ETHUSD_PERP)
      let marginRatio = 0;
      const positionMaintMargin = parseFloat(position.maintMargin || "0");

      // Extract the collateral asset from symbol (e.g., "ETHUSD_PERP" -> "ETH", "BTCUSD_PERP" -> "BTC")
      const symbolParts = position.symbol.split("USD");
      const collateralAsset = symbolParts[0]; // "ETH", "BTC", etc.

      if (isIsolated) {
        const isolatedWallet = parseFloat(isolatedWalletMap.get(positionKey) || position.isolatedWallet || "0");
        const isolatedMarginBalance = isolatedWallet + unrealizedProfit;
        marginRatio = isolatedMarginBalance > 0 ? (positionMaintMargin / isolatedMarginBalance) * 100 : 0;
      } else {
        // For cross, use the marginBalance of the specific collateral asset
        const assetMarginBalance = assetMarginBalanceMap.get(collateralAsset) || 0;
        marginRatio = assetMarginBalance > 0 ? (positionMaintMargin / assetMarginBalance) * 100 : 0;
      }

      positions.push({
        symbol: position.symbol,
        size: position.positionAmt,
        notional: position.notionalValue,
        entryPrice: position.entryPrice,
        breakEvenPrice: position.breakEvenPrice || position.entryPrice,
        markPrice: markPriceMap.get(positionKey) || position.markPrice || "0",
        liquidationPrice: liquidationPriceMap.get(positionKey) || "0",
        unrealizedPnl: position.unrealizedProfit || position.unRealizedProfit || "0",
        leverage: position.leverage || "1",
        positionSide: position.positionSide,
        marginType: isIsolated ? "isolated" : "cross",
        roe: isNaN(roe) ? "0" : roe.toFixed(2),
        margin: margin,
        maintMargin: position.maintMargin || "0",
        marginRatio: marginRatio.toFixed(2),
      });
    }
  }

  // Sort by margin balance USD value
  assets.sort((a, b) => {
    const aValue = calculateUsdValue(a.asset, parseFloat(a.marginBalance || "0"), prices);
    const bValue = calculateUsdValue(b.asset, parseFloat(b.marginBalance || "0"), prices);
    return bValue - aValue;
  });

  // Calculate BTC equivalent (btcPrice already defined above)
  const totalBtc = totalUsd / btcPrice;

  return {
    assets,
    positions,
    summary: {
      totalBalanceUsd: totalUsd.toFixed(2),
      totalBalanceBtc: totalBtc.toFixed(8),
      unrealizedPnl: totalUnrealizedPnlUsd.toFixed(4),
      unrealizedPnlRaw: totalUnrealizedPnlBtc.toFixed(8), // BTC value for display
    },
  };
}
