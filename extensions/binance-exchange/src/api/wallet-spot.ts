import { SpotAccountResponse, WalletAsset, WalletSummary } from "../types";
import { authenticatedRequest, SPOT_BASE_URL } from "./client";
import { getTickerPrices } from "./market";
import { calculateUsdValue } from "./portfolio";

// ============ Spot Wallet ============

/**
 * Get spot account information
 */
export async function getSpotAccount(): Promise<SpotAccountResponse> {
  return authenticatedRequest<SpotAccountResponse>(SPOT_BASE_URL, "/api/v3/account");
}

/**
 * Get spot wallet data with assets and summary
 */
export async function getSpotWalletData(
  existingPrices?: Map<string, number>,
): Promise<{ assets: WalletAsset[]; summary: WalletSummary }> {
  const [account, prices] = await Promise.all([getSpotAccount(), existingPrices ?? getTickerPrices()]);

  let totalUsd = 0;
  const assets: WalletAsset[] = [];

  for (const balance of account.balances) {
    const free = parseFloat(balance.free);
    const locked = parseFloat(balance.locked);
    const total = free + locked;

    if (total > 0) {
      const usdValue = calculateUsdValue(balance.asset, total, prices);
      totalUsd += usdValue;

      assets.push({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
      });
    }
  }

  // Sort by USD value (approximation - using free balance)
  assets.sort((a, b) => {
    const aValue = calculateUsdValue(a.asset, parseFloat(a.free) + parseFloat(a.locked), prices);
    const bValue = calculateUsdValue(b.asset, parseFloat(b.free) + parseFloat(b.locked), prices);
    return bValue - aValue;
  });

  // Calculate BTC equivalent
  const btcPrice = prices.get("BTCUSDT") || prices.get("BTCBUSD") || 1;
  const totalBtc = totalUsd / btcPrice;

  return {
    assets,
    summary: {
      totalBalanceUsd: totalUsd.toFixed(2),
      totalBalanceBtc: totalBtc.toFixed(8),
    },
  };
}
