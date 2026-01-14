// ============================================================================
// TradingView API Types
// ============================================================================

export type TradingViewFilterOperation = "match" | "equal" | "greater" | "less" | "between";
export type TradingViewSortOrder = "asc" | "desc";

export interface TradingViewScannerFilter {
  left: string;
  operation: TradingViewFilterOperation;
  right: number | string | number[];
}

export interface TradingViewScannerFilter2 {
  operation: "or" | "and";
  operands: Array<TradingViewScannerFilter>;
}

export interface TradingViewScannerRequest {
  filter?: Array<TradingViewScannerFilter>;
  filter2?: TradingViewScannerFilter2;
  columns: readonly string[];
  sort?: {
    sortBy: string;
    sortOrder: TradingViewSortOrder;
  };
  range?: readonly [number, number];
  options?: {
    lang?: string;
  };
}

export interface TradingViewScannerResponse {
  totalCount: number;
  data: Array<{
    s: string;
    d: Array<string | number>;
  }>;
}

// ============================================================================
// Stock Types
// ============================================================================

export type Market =
  | "america"
  | "turkey"
  | "crypto"
  | "forex"
  | "indices"
  | "commodities"
  | "bonds"
  | "etf"
  | "cfd"
  | "europe"
  | "asia"
  | "oceania"
  | "africa"
  | "america-otc";

export interface StockItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  market?: Market;
  currency?: string;
  exchange?: string;
  recommend?: number;
}

export interface WatchlistItem extends StockItem {
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  stocks: WatchlistItem[];
  createdAt: string;
  pinned?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type WatchlistArray = Watchlist[];

// ============================================================================
// Preference Types
// ============================================================================

export interface ColumnPreferences {
  column1?: string;
  column2?: string;
  column3?: string;
}

export interface AppPreferences extends ColumnPreferences {
  language?: "tr" | "en";
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormValues {
  name: string;
}

export type CreateWatchlistMode = "create" | "createAndAdd";
