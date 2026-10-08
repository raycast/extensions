export interface Quote {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  previousClose: number;
  open?: number;
  dayRange?: string;
  yearRange?: string;
  marketCap?: string;
  avgVolume?: string;
  peRatio?: string;
  dividendYield?: string;
  primaryExchange?: string;
  exchange: string;
  marketState: "PRE" | "REGULAR" | "POST" | "CLOSED";
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}
