interface ETFData {
  inflow: string | null;
  date: string | null;
}

interface FearIndexData {
  fear_index: string;
  date: string;
}

export interface MarketData {
  price: string | null;
  price_1w_ago: string | null;
  price_1d_ago: string | null;
  change_1d: string | null;
  change_1w: string | null;
}

export interface MacroData {
  btc_etf: ETFData;
  eth_etf: ETFData;
  fear_index: FearIndexData;
  sp500: MarketData;
  gold: MarketData;
  silver: MarketData;
  oil: MarketData;
  nvidia: MarketData;
  apple: MarketData;
}
