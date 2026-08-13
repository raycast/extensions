export type EntityType = 'index' | 'rate' | 'event' | 'market' | 'news';
export type PriceEntityType = 'index' | 'rate' | 'event' | 'market';
export type Platform = 'kalshi' | 'polymarket';
export type QuantityUnit = 'contracts' | 'shares' | 'usd' | 'mixed';

export type PageMeta = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type Page<T> = {
  data: T[];
  meta: PageMeta;
};

export type FindHit = {
  type: EntityType;
  id: string;
  name: string;
  subtitle?: string;
  accessory?: string;
  url?: string;
};

export type TrailingReturn = {
  label: string;
  value?: number | null;
};

export type RiskStats = {
  volatility?: number | null;
  daily_vol?: number | null;
  range_high?: number | null;
  range_low?: number | null;
  return_pct?: number | null;
};

export type EntityStats = {
  trailing_returns?: TrailingReturn[];
  risk?: RiskStats;
};

export type Market = {
  market_id: string;
  ticker?: string;
  display_ticker?: string;
  platform?: string;
  question?: string | null;
  description?: string | null;
  probability?: number | null;
  tape_mid_1m?: number | null;
  volume?: number | null;
  volume_unit?: QuantityUnit | null;
  volume_24h?: number | null;
  volume_24h_unit?: QuantityUnit | null;
  open_interest?: number | null;
  open_interest_unit?: QuantityUnit | null;
  yes_bid?: number | null;
  yes_ask?: number | null;
  no_bid?: number | null;
  no_ask?: number | null;
  status?: string | null;
  category?: string | null;
  is_constituent?: boolean;
  indices?: string[];
  end_date?: string | null;
  open_time?: string | null;
  expiration_date?: string | null;
  created_at?: string;
  updated_at?: string;
  link?: string | null;
  state_code?: string | null;
  city_code?: string | null;
  market_type?: string | null;
  rules_primary?: string | null;
  rules_secondary?: string | null;
  yes_sub_title?: string | null;
  no_sub_title?: string | null;
  result?: string | null;
  stats?: EntityStats | null;
  event_ticker?: string | null;
};

export type Event = {
  event_id: string;
  name: string;
  category?: string;
  region?: string | null;
  election_date?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  market_count?: number;
  markets?: Market[];
};

export type Index = {
  index_id: string;
  name: string;
  ticker: string;
  description?: string | null;
  constituents_count?: number;
  is_composite?: boolean;
  office_category?: string | null;
  latest_price?: number | null;
  previous_close_1d?: number | null;
  previous_close_7d?: number | null;
  change_1d?: number | null;
  change_7d?: number | null;
  change_30d?: number | null;
  change_90d?: number | null;
  price_change_1d?: number | null;
  price_change_7d?: number | null;
  methodology?: string | null;
  base_index_id?: string | null;
  updated_at?: string | null;
  created_at?: string;
  display_order?: number | null;
  halted?: boolean;
  halt_reason?: string | null;
  party_side?: 'republican' | 'democrat' | null;
  stats?: EntityStats | null;
  constituents?: Constituent[];
  composition?: {
    attribution?: Array<{
      market_id?: string;
      ticker?: string;
      display_ticker?: string;
      name?: string | null;
      contribution?: number;
      weight?: number;
      price?: number;
    }>;
  } | null;
};

export type Constituent = {
  market_id?: string;
  index_id?: string;
  ticker?: string;
  display_ticker?: string;
  name?: string | null;
  question?: string | null;
  platform?: string;
  weight?: number | null;
  latest_price?: number | null;
  probability?: number | null;
  price?: number | null;
};

export type RateSource = {
  market_id: string;
  display_ticker?: string;
  platform?: string;
  weight?: number;
  question?: string | null;
  latest_price?: number | null;
  end_date?: string | null;
  is_active?: boolean | null;
};

export type Rate = {
  rate_id: string;
  name: string;
  methodology?: string;
  sources_count?: number;
  latest_price?: number | null;
  spread?: number | null;
  previous_close_1d?: number | null;
  price_change_1d?: number | null;
  sources?: RateSource[];
};

export type NewsArticle = {
  id: string;
  article_id?: string;
  title: string;
  url?: string | null;
  published_date?: string | null;
  author?: string | null;
  source?: string | null;
  image_url?: string | null;
  tickers?: string[];
};

export type PricePoint = {
  timestamp: string;
  price: number;
  ohlc?: { open: number; high: number; low: number; close: number } | null;
};

export type Candle = {
  timestamp: string;
  yes_bid?: number | null;
  yes_ask?: number | null;
  mid: number;
  close?: number | null;
  volume?: number | null;
  source: string;
  synthetic_book: boolean;
};

export type SimilarMarket = {
  market_id: string;
  similarity: number;
  description?: string | null;
  platform?: string | null;
  latest_price?: number | null;
  question?: string | null;
};

export type Trade = {
  timestamp?: string;
  price?: number | null;
  size?: number | null;
  side?: string | null;
  platform?: string | null;
};

export type Quote = {
  timestamp?: string;
  yes_bid?: number | null;
  yes_ask?: number | null;
  mid?: number | null;
};

export type SnapshotMeta = {
  snapshot_at: string;
  refreshed_at: string;
  day_boundary_timezone: string;
  market_statuses: string[];
  market_platforms: string[];
  market_categories: string[];
  freshness: Array<{
    tier: string;
    mode: string;
    delay_seconds: number;
  }>;
};

export type PublicPlan = {
  id?: string;
  name?: string;
  title?: string;
  price?: number | string;
  interval?: string;
};
