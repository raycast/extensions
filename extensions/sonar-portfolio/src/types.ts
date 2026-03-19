export interface Position {
  instrument: {
    id: number;
    isin: string;
    yahooSymbol: string | null;
    ticker: string | null;
    name: string;
    type: "stock" | "fund" | "etf" | "crypto";
    currency: string;
    exchange: string | null;
    sector: string | null;
  };
  accountName: string;
  quantity: number;
  averagePrice: number;
  costBasis: number;
  currentPrice: number | null;
  currentValue: number | null;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  realizedGainLoss: number;
  totalDividends: number;
  dayChange: number | null;
  dayChangePercent: number | null;
}

export interface Account {
  id: number;
  name: string;
  broker: string;
  walletAddress: string | null;
}

export interface DeepDiveData {
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedGainLoss: number;
  totalUnrealizedGainLossPercent: number;
  totalRealizedGainLoss: number;
  totalDividends: number;
  holdingCount: number;
  top5Concentration: number;
  reportingCurrency: string;
  topHoldings: Array<{
    name: string;
    ticker: string | null;
    value: number;
    weight: number;
    unrealizedGainLoss: number;
    unrealizedGainLossPercent: number;
  }>;
  sectorAllocation: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  diversification: {
    overall: number;
    label: "Low" | "Moderate" | "Good" | "Excellent";
  };
}

export interface PulseData {
  status: "ok" | "empty" | "expired";
  summary?: string;
  items?: Array<{
    type: string;
    headline: string;
    instrument?: string;
    isin?: string;
    explanation: string;
    suggestedAction?: string;
  }>;
  createdAt?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  isin?: string;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  marketCap?: number;
  pe?: number;
  high52w?: number;
  low52w?: number;
}
