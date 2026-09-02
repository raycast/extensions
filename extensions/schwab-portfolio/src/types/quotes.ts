export interface QuoteResponse {
  [symbol: string]: QuoteData;
}

export interface QuoteData {
  assetMainType?: string;
  assetSubType?: string;
  symbol: string;
  cusip?: string;
  quote?: Quote;
  fundamental?: Fundamental;
  reference?: Reference;
}

export interface Quote {
  "52WeekHigh"?: number;
  "52WeekLow"?: number;
  askPrice?: number;
  askSize?: number;
  bidPrice?: number;
  bidSize?: number;
  closePrice?: number;
  highPrice?: number;
  lowPrice?: number;
  lastPrice?: number;
  openPrice?: number;
  netChange?: number;
  netPercentChange?: number;
  totalVolume?: number;
  mark?: number;
  markChange?: number;
  markPercentChange?: number;
  tradeTime?: number;
  quoteTime?: number;
  securityStatus?: string;
  volatility?: number;
}

export interface Fundamental {
  avg10DaysVolume?: number;
  avg1YearVolume?: number;
  divYield?: number;
  divAmount?: number;
  divFreq?: number;
  divDate?: string;
  eps?: number;
  peRatio?: number;
  pegRatio?: number;
  pbRatio?: number;
  prRatio?: number;
  pcfRatio?: number;
  marketCap?: number;
  marketCapFloat?: number;
  high52?: number;
  low52?: number;
  beta?: number;
  fundLeverageFactor?: number;
}

export interface Reference {
  cusip?: string;
  description?: string;
  exchange?: string;
  exchangeName?: string;
  isHardToBorrow?: boolean;
  isShortable?: boolean;
  htbRate?: number;
  symbol?: string;
}

export interface PriceHistoryResponse {
  candles: Candle[];
  symbol: string;
  empty: boolean;
  previousClose?: number;
  previousCloseDate?: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  datetime: number;
}

export type PeriodType = "day" | "month" | "year" | "ytd";
export type FrequencyType = "minute" | "daily" | "weekly" | "monthly";

export interface Timeframe {
  label: string;
  value: string;
  periodType: PeriodType;
  period: number;
  frequencyType: FrequencyType;
  frequency: number;
}

export interface InstrumentSearchResponse {
  instruments?: InstrumentResult[];
}

export interface InstrumentResult {
  symbol: string;
  description: string;
  cusip: string;
  exchange: string;
  assetType: string;
}

export interface MoversResponse {
  screeners?: MoverItem[];
}

export interface MoverItem {
  symbol?: string;
  description?: string;
  lastPrice?: number;
  netChange?: number;
  netPercentChange?: number;
  volume?: number;
  direction?: string;
}
