import {
  IsolatedMarginAccountResponse,
  MarginAccountResponse,
  MarginPosition,
  WalletAsset,
  WalletSummary,
} from "../types";
import { authenticatedRequest, SPOT_BASE_URL } from "./client";
import { getTickerPrices } from "./market";
import { calculateUsdValue } from "./portfolio";

// ============ Cross Margin ============

/**
 * Get cross margin account information
 */
export async function getMarginAccount(): Promise<MarginAccountResponse> {
  return authenticatedRequest<MarginAccountResponse>(SPOT_BASE_URL, "/sapi/v1/margin/account");
}

/**
 * Get cross margin wallet data with assets, positions, and summary
 */
export async function getMarginWalletData(existingPrices?: Map<string, number>): Promise<{
  assets: WalletAsset[];
  marginPositions: MarginPosition[];
  summary: WalletSummary;
}> {
  const [account, prices] = await Promise.all([getMarginAccount(), existingPrices ?? getTickerPrices()]);

  const assets: WalletAsset[] = [];
  const marginPositions: MarginPosition[] = [];
  const btcUsdt = prices.get("BTCUSDT") || 0;

  for (const userAsset of account.userAssets) {
    const free = parseFloat(userAsset.free);
    const locked = parseFloat(userAsset.locked);
    const total = free + locked;
    const netAsset = parseFloat(userAsset.netAsset);

    if (total > 0 || parseFloat(userAsset.borrowed) > 0) {
      assets.push({
        asset: userAsset.asset,
        free: userAsset.free,
        locked: userAsset.locked,
        borrowed: userAsset.borrowed,
        interest: userAsset.interest,
        netAsset: userAsset.netAsset,
      });

      // Add to positions if has non-zero net asset
      if (netAsset !== 0) {
        const indexPrice = calculateUsdValue(userAsset.asset, 1, prices);
        const positionValue = netAsset * indexPrice;

        marginPositions.push({
          asset: userAsset.asset,
          position: userAsset.netAsset,
          positionValue: positionValue.toFixed(2),
          indexPrice: indexPrice.toFixed(8),
        });
      }
    }
  }

  // Sort assets by net asset value
  assets.sort((a, b) => {
    const aValue = calculateUsdValue(a.asset, Math.abs(parseFloat(a.netAsset || "0")), prices);
    const bValue = calculateUsdValue(b.asset, Math.abs(parseFloat(b.netAsset || "0")), prices);
    return bValue - aValue;
  });

  // Sort positions by position value
  marginPositions.sort((a, b) => Math.abs(parseFloat(b.positionValue)) - Math.abs(parseFloat(a.positionValue)));

  const totalBtc = parseFloat(account.totalNetAssetOfBtc);

  return {
    assets,
    marginPositions,
    summary: {
      totalBalanceUsd: (totalBtc * btcUsdt).toFixed(2),
      totalBalanceBtc: account.totalNetAssetOfBtc,
      marginLevel: account.marginLevel,
    },
  };
}

// ============ Isolated Margin ============

/**
 * Get isolated margin account information
 */
export async function getIsolatedMarginAccount(): Promise<IsolatedMarginAccountResponse> {
  return authenticatedRequest<IsolatedMarginAccountResponse>(SPOT_BASE_URL, "/sapi/v1/margin/isolated/account");
}

/**
 * Extended wallet asset interface for isolated margin with additional fields
 */
export interface IsolatedMarginWalletAsset extends WalletAsset {
  symbol: string;
  marginLevel: string;
  marginLevelStatus: string;
  indexPrice: string;
  liquidatePrice: string;
}

/**
 * Extended margin position interface for isolated margin
 */
export interface IsolatedMarginPosition extends MarginPosition {
  pair: string;
}

/**
 * Isolated margin pair position for grouped display
 */
export interface IsolatedMarginPairPosition {
  pair: string;
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

/**
 * Get isolated margin wallet data with assets, positions, and summary
 */
export async function getIsolatedMarginWalletData(existingPrices?: Map<string, number>): Promise<{
  assets: IsolatedMarginWalletAsset[];
  marginPositions: IsolatedMarginPairPosition[];
  summary: WalletSummary;
}> {
  const [account, prices] = await Promise.all([getIsolatedMarginAccount(), existingPrices ?? getTickerPrices()]);

  const assets: IsolatedMarginWalletAsset[] = [];
  const marginPositions: IsolatedMarginPairPosition[] = [];
  const btcUsdt = prices.get("BTCUSDT") || 0;

  for (const pair of account.assets) {
    // Check if either base or quote asset has any balance or borrowed
    const baseTotal = parseFloat(pair.baseAsset.totalAsset);
    const quoteTotal = parseFloat(pair.quoteAsset.totalAsset);
    const baseBorrowed = parseFloat(pair.baseAsset.borrowed);
    const quoteBorrowed = parseFloat(pair.quoteAsset.borrowed);

    if (baseTotal > 0 || quoteTotal > 0 || baseBorrowed > 0 || quoteBorrowed > 0) {
      const indexPrice = parseFloat(pair.indexPrice) || 0;
      const baseNetAsset = parseFloat(pair.baseAsset.netAsset);
      const quoteNetAsset = parseFloat(pair.quoteAsset.netAsset);

      // Add base asset if has balance
      if (baseTotal > 0 || baseBorrowed > 0) {
        assets.push({
          symbol: pair.symbol,
          asset: pair.baseAsset.asset,
          free: pair.baseAsset.free,
          locked: pair.baseAsset.locked,
          borrowed: pair.baseAsset.borrowed,
          interest: pair.baseAsset.interest,
          netAsset: pair.baseAsset.netAsset,
          marginLevel: pair.marginLevel,
          marginLevelStatus: pair.marginLevelStatus,
          indexPrice: pair.indexPrice,
          liquidatePrice: pair.liquidatePrice,
        });
      }

      // Add quote asset if has balance
      if (quoteTotal > 0 || quoteBorrowed > 0) {
        assets.push({
          symbol: pair.symbol,
          asset: pair.quoteAsset.asset,
          free: pair.quoteAsset.free,
          locked: pair.quoteAsset.locked,
          borrowed: pair.quoteAsset.borrowed,
          interest: pair.quoteAsset.interest,
          netAsset: pair.quoteAsset.netAsset,
          marginLevel: pair.marginLevel,
          marginLevelStatus: pair.marginLevelStatus,
          indexPrice: pair.indexPrice,
          liquidatePrice: pair.liquidatePrice,
        });
      }

      // Add pair position if either asset has non-zero netAsset
      if (baseNetAsset !== 0 || quoteNetAsset !== 0) {
        // Position Value is in base asset (e.g., BTC)
        // Base asset: netAsset is already in base asset
        // Quote asset: convert to base asset by dividing by index price
        const basePositionValue = baseNetAsset; // Already in BTC
        const quotePositionValue = indexPrice > 0 ? quoteNetAsset / indexPrice : 0; // Convert USDT to BTC

        marginPositions.push({
          pair: pair.symbol,
          baseAsset: {
            asset: pair.baseAsset.asset,
            netAsset: pair.baseAsset.netAsset,
            positionValue: basePositionValue.toFixed(8),
          },
          quoteAsset: {
            asset: pair.quoteAsset.asset,
            netAsset: pair.quoteAsset.netAsset,
            positionValue: quotePositionValue.toFixed(8),
          },
          indexPrice: pair.indexPrice,
          liquidationPrice: pair.liquidatePrice,
          marginLevel: pair.marginLevel,
        });
      }
    }
  }

  // Sort assets by net asset value
  assets.sort((a, b) => {
    const aValue = calculateUsdValue(a.asset, Math.abs(parseFloat(a.netAsset || "0")), prices);
    const bValue = calculateUsdValue(b.asset, Math.abs(parseFloat(b.netAsset || "0")), prices);
    return bValue - aValue;
  });

  // Sort positions by position value (sum of base and quote asset values)
  marginPositions.sort((a, b) => {
    const aValue = Math.abs(parseFloat(a.baseAsset.positionValue)) + Math.abs(parseFloat(a.quoteAsset.positionValue));
    const bValue = Math.abs(parseFloat(b.baseAsset.positionValue)) + Math.abs(parseFloat(b.quoteAsset.positionValue));
    return bValue - aValue;
  });

  const totalBtc = parseFloat(account.totalNetAssetOfBtc);

  return {
    assets,
    marginPositions,
    summary: {
      totalBalanceUsd: (totalBtc * btcUsdt).toFixed(2),
      totalBalanceBtc: account.totalNetAssetOfBtc,
    },
  };
}
