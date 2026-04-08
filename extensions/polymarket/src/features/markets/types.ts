export interface ParsedOutcome {
  outcome: string;
  outcomePrice: string;
  clobTokenId: string;
}

export interface PolyPricePoint {
  t: number;
  p: number;
}

export interface PolyPriceHistory {
  history: PolyPricePoint[];
}

export type Interval = "1h" | "1d" | "1w" | "1m" | "max";

export interface Market {
  question: string;
  outcomes: string;
  clobTokenIds: string;
  icon: string;
  outcomePrices: string;
  volume: number;
  volume24hr: number;
  slug: string;
  conditionId: string;
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

export interface Tag {
  id: string;
  label: string;
  slug: string;
}

export interface Ticker {
  title: string;
  icon: string;
  volume: number;
  volume24hr: number;
  markets: Market[];
  tags?: Tag[];
  slug: string;
}
