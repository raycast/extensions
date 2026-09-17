export type AssetKind =
  | "stock"
  | "crypto"
  | "token"
  | "polymarket"
  | "binance"
  | "binanceperp";

export type MenuBarStyle = "primary" | "primary-change";
export type LogoDisplay = "off" | "menu-bar";

export type Asset = {
  id: string;
  kind: AssetKind;
  symbol: string;
  name: string;
  provider: string;
  query: string;
  outcome?: string;
  chain?: string;
  imageUrl?: string;
};

export type Quote = {
  id: string;
  kind: AssetKind;
  symbol: string;
  name: string;
  price: number;
  priceLabel: string;
  changePercent?: number;
  provider: string;
  asOf: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  error?: string;
  retryAfterAt?: string;
  url?: string;
  subtitle?: string;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  volume?: number;
  marketCap?: number;
  marketState?: string;
  fundingRate?: number;
  imageUrl?: string;
};

export type SearchResult = Asset & {
  subtitle: string;
  url?: string;
};

export type RefreshFailure = {
  id: string;
  provider: string;
  message: string;
  status?: number;
};

export type QuoteStatus = {
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  error?: string;
  retryAfterAt?: string;
};

export type RefreshReport = {
  quotes: Record<string, Quote>;
  updatedIds: string[];
  failures: RefreshFailure[];
  skippedIds: string[];
};
