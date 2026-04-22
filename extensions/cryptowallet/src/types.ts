export type TransactionType = "buy" | "sell" | "transfer_in" | "transfer_out";

export type Portfolio = {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  pinnedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CryptoTransaction = {
  id: string;
  portfolioId: string;
  assetId?: number;
  assetSymbol: string;
  assetName: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee: number;
  currency?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Quote = {
  id?: number;
  symbol: string;
  name: string;
  price: number;
  percentChange24h?: number;
  percentChange7d?: number;
  marketCap?: number;
  lastUpdated?: string;
};

export type AssetSearchResult = {
  id: number;
  rank?: number;
  symbol: string;
  name: string;
  slug?: string;
};

export type AssetPosition = {
  assetId?: number;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  costBasis: number;
  investedAmount: number;
  realizedPnl: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
  totalPnl?: number;
  totalPnlPercent?: number;
  percentChange24h?: number;
  percentChange7d?: number;
  transactions: CryptoTransaction[];
};

export type PortfolioSnapshot = {
  portfolio: Portfolio;
  positions: AssetPosition[];
  totalCostBasis: number;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalPnlPercent: number;
};

export type WalletBackup = {
  version: 1;
  exportedAt: string;
  portfolios: Portfolio[];
  transactions: CryptoTransaction[];
};
