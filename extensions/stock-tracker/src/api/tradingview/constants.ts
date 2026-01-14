import { Market } from "../../types";

// ============================================================================
// Constants
// ============================================================================

export const COLUMNS = [
  "name",
  "description",
  "close",
  "change",
  "change_abs",
  "volume",
  "Recommend.All",
  "exchange",
  "currency",
] as const;

export const MARKETS: readonly Market[] = [
  "america",
  "turkey",
  "crypto",
  "forex",
  "indices",
  "commodities",
  "bonds",
  "etf",
  "cfd",
  "europe",
  "asia",
  "oceania",
  "africa",
  "america-otc",
] as const;

export const MIN_REQUIRED_COLUMNS = COLUMNS.length - 1;
