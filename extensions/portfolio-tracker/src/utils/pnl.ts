/**
 * Unrealized profit/loss (P&L) calculations.
 *
 * Pure functions with zero side effects and zero Raycast imports.
 * All calculations happen in the position's native currency — callers
 * convert to the base currency via the position's FX rate.
 *
 * Cost basis model: each position stores a single average purchase price
 * (`Position.avgCostPrice`). Buying more units updates the average via
 * `computeWeightedAvgCost`. Positions without an average cost recorded
 * simply have no P&L data.
 */

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

/** Result of a P&L calculation for a single position */
export interface PnlResult {
  /** Total invested: units × avgCostPrice */
  costBasis: number;
  /** Unrealized profit/loss: currentValue − costBasis */
  pnl: number;
  /** Unrealized profit/loss as a percentage of costBasis */
  pnlPercent: number;
}

// ──────────────────────────────────────────
// Calculations
// ──────────────────────────────────────────

/**
 * Computes unrealized P&L for a position from its average purchase price.
 *
 * Returns undefined when the inputs cannot produce a meaningful result
 * (no cost recorded, non-positive units, or no current price available).
 *
 * @param units - Number of units held
 * @param avgCostPrice - Average purchase price per unit (native currency)
 * @param currentPrice - Current market price per unit (native currency)
 * @returns P&L result in the position's native currency, or undefined
 *
 * @example
 * // Invested $100 in ETH at $4,000 (0.025 units), ETH now at $2,000:
 * computePnl(0.025, 4000, 2000)
 * // { costBasis: 100, pnl: -50, pnlPercent: -50 }
 */
export function computePnl(
  units: number,
  avgCostPrice: number | undefined,
  currentPrice: number,
): PnlResult | undefined {
  if (avgCostPrice === undefined || avgCostPrice <= 0) return undefined;
  if (units <= 0 || currentPrice <= 0) return undefined;

  const costBasis = units * avgCostPrice;
  const currentValue = units * currentPrice;
  const pnl = currentValue - costBasis;
  const pnlPercent = (pnl / costBasis) * 100;

  return { costBasis, pnl, pnlPercent };
}

/**
 * Computes the new average cost after buying additional units.
 *
 * Standard weighted average:
 *   newAvg = (existingUnits × existingAvg + addedUnits × pricePaid) / totalUnits
 *
 * When no existing average is recorded, the price paid for the new units
 * becomes the average for the WHOLE position — callers should only do this
 * when that assumption is acceptable (the AddUnitsForm explains it to the user).
 *
 * @param existingUnits - Units held before the purchase
 * @param existingAvgCost - Average cost of those units, or undefined if never recorded
 * @param addedUnits - Units being added (must be > 0)
 * @param pricePaid - Price paid per new unit (native currency)
 * @returns The new average cost per unit, or undefined if inputs are invalid
 *
 * @example
 * computeWeightedAvgCost(10, 100, 10, 200) // 150
 * computeWeightedAvgCost(10, undefined, 5, 80) // 80
 */
export function computeWeightedAvgCost(
  existingUnits: number,
  existingAvgCost: number | undefined,
  addedUnits: number,
  pricePaid: number,
): number | undefined {
  if (addedUnits <= 0 || pricePaid <= 0) return undefined;

  const hasExistingCost = existingAvgCost !== undefined && existingAvgCost > 0 && existingUnits > 0;
  if (!hasExistingCost) return pricePaid;

  const totalUnits = existingUnits + addedUnits;
  return (existingUnits * existingAvgCost + addedUnits * pricePaid) / totalUnits;
}
