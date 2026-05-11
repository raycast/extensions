import { WalletType } from "./types";

// ============ Types ============

export interface WalletOption {
  id: WalletType;
  name: string;
}

// ============ Constants ============

export const WALLET_OPTIONS: WalletOption[] = [
  { id: "spot", name: "Spot" },
  { id: "cross-margin", name: "Cross Margin" },
  { id: "isolated-margin", name: "Isolated Margin" },
  { id: "usdm-futures", name: "USD-M Futures" },
  { id: "coinm-futures", name: "COIN-M Futures" },
];

export const WALLET_NAMES: Record<WalletType, string> = {
  spot: "Spot",
  "cross-margin": "Cross Margin",
  "isolated-margin": "Isolated Margin",
  "usdm-futures": "USD-M Futures",
  "coinm-futures": "COIN-M Futures",
};

/**
 * Margin level value used to represent "infinite" or undefined margin level.
 * Values >= this threshold should be treated as having no margin risk.
 */
export const MARGIN_LEVEL_INFINITY = 999;
