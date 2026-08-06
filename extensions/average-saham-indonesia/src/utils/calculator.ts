import { AverageInput, AverageResult } from "../types";

/**
 * Number of shares in a single lot on the Bursa Efek Indonesia (IDX).
 * 1 Lot = 100 Shares.
 */
export const SHARES_PER_LOT = 100;

/**
 * Converts a lot amount into the number of underlying shares.
 */
export function calculateShares(lot: number): number {
  return lot * SHARES_PER_LOT;
}

/**
 * Calculates the capital (modal) invested for a given price and share count.
 */
export function calculateInvestment(price: number, shares: number): number {
  return price * shares;
}

/**
 * Calculates the new average share price after buying additional shares.
 *
 * Formula:
 * ```
 * Old Shares = Old Lot × 100
 * New Shares = New Lot × 100
 *
 * Old Investment = Old Price × Old Shares
 * New Investment = New Price × New Shares
 *
 * Total Investment = Old Investment + New Investment
 * Total Shares = Old Shares + New Shares
 *
 * Average Price = Total Investment / Total Shares
 * ```
 *
 * Note: `newInvestment` (the cash needed for the new purchase) is already
 * part of `totalInvestment`, so it must NOT be added again when computing
 * `averagePrice`. It's returned separately as `newInvestmentNeeded` purely
 * so the UI can show "how much money to prepare for this purchase".
 */
export function calculateAverage({ oldPrice, oldLot, newPrice, newLot }: AverageInput): AverageResult {
  const oldShares = calculateShares(oldLot);
  const newShares = calculateShares(newLot);

  const oldInvestment = calculateInvestment(oldPrice, oldShares);
  const newInvestment = calculateInvestment(newPrice, newShares);

  const totalShares = oldShares + newShares;
  const totalInvestment = oldInvestment + newInvestment;
  const averagePrice = totalShares > 0 ? totalInvestment / totalShares : 0;

  return {
    totalLot: oldLot + newLot,
    totalShares,
    totalInvestment,
    newInvestmentNeeded: newInvestment,
    averagePrice,
  };
}
