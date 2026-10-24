export type SignedColor = "green" | "red" | "secondary";

export type CandleInterval = "1h" | "4h" | "1d";

export type PortfolioPeriod = "day" | "week" | "month" | "allTime";

export type PortfolioMetric = "accountValue" | "pnl";

export interface PortfolioPoint {
  time: number;
  value: number;
}

export type MarketSort = "volume" | "gainers" | "losers" | "funding";

export interface MarketOverview {
  marketCount: number;
  totalVolumeUsd: number;
  totalOpenInterestUsd: number;
}

/** Health buckets for how close a position/account is to liquidation. */
export type RiskLevel = "safe" | "warning" | "danger";

export interface PositionRisk {
  /** Fractional distance from mark to liquidation, e.g. 0.12 = 12% away. null when no liq price. */
  distanceToLiq: number | null;
  level: RiskLevel;
}

export interface AccountRisk {
  /** Maintenance-margin headroom: 1 = fully safe, 0 = at maintenance margin. null when flat. */
  marginRatio: number | null;
  level: RiskLevel;
}

export interface Wallet {
  id: string;
  label: string;
  address: `0x${string}`;
}

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketRow {
  coin: string;
  price: number;
  markPrice: number;
  previousDayPrice: number;
  dayChange: number;
  funding: number;
  openInterest: number;
  dayVolumeBase: number;
  dayVolumeUsd: number;
  maxLeverage: number;
}

export interface PositionRow {
  id: string;
  walletId: string;
  walletLabel: string;
  coin: string;
  side: "Long" | "Short";
  size: number;
  leverage: number;
  leverageType: "cross" | "isolated";
  entryPrice: number;
  markPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  returnOnEquity: number;
  liquidationPrice: number | null;
  marginUsed: number;
}

export interface PositionSummary {
  accountValue: number;
  unrealizedPnl: number;
  marginUsed: number;
  maintenanceMarginUsed: number;
}

export interface AggregatedPositions {
  summary: PositionSummary;
  positions: PositionRow[];
}
