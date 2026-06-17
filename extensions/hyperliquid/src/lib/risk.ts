import type { AccountRisk, PositionRisk, RiskLevel } from "./types";

export interface RiskThresholds {
  /** At or below this fractional distance/headroom a position is "danger". */
  danger: number;
  /** At or below this fractional distance/headroom a position is "warning". */
  warning: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  danger: 0.05,
  warning: 0.15,
};

/** Builds thresholds from a user-set "danger distance" percentage (warning sits at 3x). */
export function thresholdsFromPercent(percent: number | undefined): RiskThresholds {
  if (percent === undefined || !Number.isFinite(percent) || percent <= 0) {
    return DEFAULT_RISK_THRESHOLDS;
  }

  const danger = percent / 100;
  return { danger, warning: Math.min(danger * 3, 0.9) };
}

function levelFor(value: number | null, thresholds: RiskThresholds): RiskLevel {
  if (value === null) {
    return "safe";
  }
  if (value <= thresholds.danger) {
    return "danger";
  }
  if (value <= thresholds.warning) {
    return "warning";
  }
  return "safe";
}

/**
 * Fractional gap between the mark price and the liquidation price, relative to mark.
 * Works for both sides because liquidation can sit above (short) or below (long) the mark.
 */
export function getPositionRisk(
  markPrice: number,
  liquidationPrice: number | null,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): PositionRisk {
  if (liquidationPrice === null || !Number.isFinite(liquidationPrice) || markPrice <= 0) {
    return { distanceToLiq: null, level: "safe" };
  }

  const distanceToLiq = Math.abs(markPrice - liquidationPrice) / markPrice;
  return { distanceToLiq, level: levelFor(distanceToLiq, thresholds) };
}

/**
 * Maintenance-margin headroom for the whole account: 1 means fully safe,
 * 0 means the account value has fallen to the maintenance margin requirement.
 */
export function getAccountRisk(
  accountValue: number,
  maintenanceMarginUsed: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): AccountRisk {
  if (accountValue <= 0 || maintenanceMarginUsed <= 0) {
    return { marginRatio: null, level: "safe" };
  }

  const marginRatio = Math.max(0, (accountValue - maintenanceMarginUsed) / accountValue);
  return { marginRatio, level: levelFor(marginRatio, thresholds) };
}

/** Picks the most severe level across several positions/accounts. */
export function worstLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.includes("danger")) {
    return "danger";
  }
  if (levels.includes("warning")) {
    return "warning";
  }
  return "safe";
}

/** Compact emoji ramp for menu-bar / accessory display. */
export function riskBadge(level: RiskLevel): string {
  switch (level) {
    case "danger":
      return "🔴";
    case "warning":
      return "🟡";
    default:
      return "🟢";
  }
}
