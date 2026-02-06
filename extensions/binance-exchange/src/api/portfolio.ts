import { WalletBalanceItem } from "../types";
import { authenticatedRequest, SPOT_BASE_URL } from "./client";

/**
 * Get wallet balances for all wallets in a single call
 * @param quoteAsset - The quote asset (BTC, USDT, etc.). Default is BTC.
 */
export async function getWalletBalances(quoteAsset: string = "BTC"): Promise<WalletBalanceItem[]> {
  return authenticatedRequest<WalletBalanceItem[]>(SPOT_BASE_URL, "/sapi/v1/asset/wallet/balance", { quoteAsset });
}

/**
 * Get total portfolio balance in both BTC and USD
 */
export async function getTotalPortfolioBalance(): Promise<{ totalBtc: number; totalUsd: number }> {
  const [balancesBtc, balancesUsd] = await Promise.all([getWalletBalances("BTC"), getWalletBalances("USDT")]);

  const totalBtc = balancesBtc.reduce((sum, item) => sum + parseFloat(item.balance), 0);
  const totalUsd = balancesUsd.reduce((sum, item) => sum + parseFloat(item.balance), 0);

  return { totalBtc, totalUsd };
}

/**
 * Calculate USD value of an asset
 */
export function calculateUsdValue(asset: string, amount: number, prices: Map<string, number>): number {
  if (amount === 0) return 0;

  // USDT is our reference for USD value
  if (asset === "USDT") {
    return amount;
  }

  // Try direct USDT pair (includes other stablecoins like USDCUSDT, BUSDUSDT)
  const usdtPrice = prices.get(`${asset}USDT`);
  if (usdtPrice) {
    return amount * usdtPrice;
  }

  // Try BUSD pair (convert via BUSD -> USDT if needed)
  const busdPrice = prices.get(`${asset}BUSD`);
  const busdUsdt = prices.get("BUSDUSDT");
  if (busdPrice && busdUsdt) {
    return amount * busdPrice * busdUsdt;
  }

  // Try via BTC
  const btcPrice = prices.get(`${asset}BTC`);
  const btcUsdt = prices.get("BTCUSDT");
  if (btcPrice && btcUsdt) {
    return amount * btcPrice * btcUsdt;
  }

  return 0;
}
