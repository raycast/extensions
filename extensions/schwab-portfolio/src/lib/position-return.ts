import type { Position } from "../types/accounts";

/** Price return on open holdings, excluding dividends and realized gains. */
export function getPositionReturn(position: Position) {
  const quantity = (position.longQuantity ?? 0) - (position.shortQuantity ?? 0);
  const averageCost = position.averagePrice ?? position.averageLongPrice ?? position.taxLotAverageLongPrice;
  // Adjusted options need an explicit multiplier; never assume all contracts represent 100 shares.
  const multiplier = position.instrument.assetType === "OPTION" ? position.instrument.optionMultiplier : 1;
  const supported = ["EQUITY", "ETF", "MUTUAL_FUND", "OPTION"].includes(position.instrument.assetType);
  const costBasis =
    supported && averageCost != null && multiplier != null ? averageCost * quantity * multiplier : undefined;
  const unrealizedPL =
    quantity >= 0 && position.longOpenProfitLoss != null
      ? position.longOpenProfitLoss
      : position.marketValue != null && costBasis != null
        ? position.marketValue - costBasis
        : undefined;
  const unrealizedPLPct =
    unrealizedPL != null && costBasis != null && costBasis !== 0
      ? (unrealizedPL / Math.abs(costBasis)) * 100
      : undefined;
  return { averageCost, costBasis, unrealizedPL, unrealizedPLPct };
}
