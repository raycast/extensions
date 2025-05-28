interface ParsedOutcome {
  outcome: string;
  outcomePrice: string;
  clobTokenId: string;
}

interface PolyPricePoint {
  t: number;
  p: number;
}

interface PolyPriceHistory {
  history: PolyPricePoint[];
}

type Interval = "1h" | "1d" | "1w" | "1m" | "max";

interface Market {
  question: string;
  outcomes: string;
  clobTokenIds: string;
  icon: string;
  outcomePrices: string;
  volume: number;
  volume24hr: number;
  slug: string;
  groupItemTitle: string;
  active: boolean;
  closed: boolean;
  new: boolean;
  featured: boolean;
  archived: boolean;
  restricted: boolean;
  spread?: number;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
}

interface Tag {
  id: string;
  label: string;
  slug: string;
}

interface Ticker {
  title: string;
  icon: string;
  volume: number;
  volume24hr: number;
  markets: Market[];
  tags?: Tag[];
  slug: string;
}

interface DataPoint {
  x: number;
  y: number;
}

export type { Ticker, Market, Tag, ParsedOutcome, Interval, PolyPriceHistory, PolyPricePoint, DataPoint };
