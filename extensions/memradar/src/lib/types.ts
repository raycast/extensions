// Shapes of https://memradar.com/data/raycast-v1-products.json
//
// A field whose value is unknown is OMITTED by the generator rather than sent
// as null, so every optional below means "genuinely not known for this
// product", never "null slipped through". Do not add `| null` here.
export interface PricePoint {
  price_usd: number;
  date: string; // YYYY-MM-DD
}

export type BuyState = "good" | "typical" | "elevated";

export interface Product {
  sku: string;
  name: string;
  slug: string;
  category: "ram" | "ssd";
  url: string;
  price_usd: number;
  tracked_days: number;
  brand?: string;
  all_time_low?: PricePoint;
  all_time_high?: PricePoint;
  avg_90d_usd?: number;
  buy_state?: BuyState;
  history_monthly?: [string, number][]; // [YYYY-MM, price]
}

export interface ProductsPayload {
  version: number;
  generated: string; // YYYY-MM-DD, the date the data was computed
  update_frequency: string;
  notice: string;
  attribution: string; // rendered verbatim; never restated in this codebase
  fields: string;
  source: string;
  methodology: string;
  count: number;
  products: Product[];
}

// Shapes of https://memradar.com/data/raycast-v1-market.json
export interface MarketPeriod {
  pct_change: number;
  product_count: number;
}

export interface MarketSegment {
  segment: string;
  label: string;
  median_price_usd?: number;
  median_usd_per_gb?: number;
  periods: Record<string, MarketPeriod>;
}

export interface MarketPayload {
  version: number;
  generated: string;
  computed_at: string; // when the underlying stats run happened; not the build date
  update_frequency: string;
  notice: string;
  method: string; // travels with the numbers: medians, periods not comparable
  attribution: string;
  source: string;
  methodology: string;
  segments: MarketSegment[];
}
