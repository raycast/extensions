interface Market {
  question: string;
  outcomes: string;
  outcomePrices: string;
  volume: number;
  volume24hr: number;
  slug: string;
  groupItemTitle: string;
}

interface Ticker {
  title: string;
  volume: number;
  volume24hr: number;
  markets: Market[];
  slug: string;
}

export type { Ticker, Market };
