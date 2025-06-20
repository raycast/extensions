export interface StockQuote {
  symbol: string;
  price: number;
  currency: string;
  marketState: string;
}

export interface OptionData {
  strike: number;
  bid: number;
  ask: number;
  midPrice: number;
  expiration: string;
  volume?: string;
  openInterest?: string;
  impliedVolatility?: string;
  isEstimated?: boolean;
}

export interface CalculationResult {
  shares: number;
  contracts: number;
  totalCost: number;
  maxLoss: number;
  actualMaxLoss: number;
  stockCost: number;
  optionCost: number;
  breakeven: number;
  protectionLevel: number;
  optionDetails: OptionData;
}

export interface CalculationInputs {
  ticker: string;
  stopLoss: number;
  maxLoss: number;
  holdingPeriod: string;
  alphaVantageApiKey: string;
}

export type HoldingPeriod = "1w" | "2w" | "1m";
