export type MarketStatus = "open" | "closed" | "settled";

export type KalshiMarket = {
  ticker: string;
  series_ticker?: string;
  event_ticker?: string;
  market_type?: string;
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  status?: string;
  response_price_units?: string;
  notional_value?: number;
  tick_size?: number;
  yes_bid?: number;
  yes_bid_dollars?: string;
  yes_ask?: number;
  yes_ask_dollars?: string;
  no_bid?: number;
  no_bid_dollars?: string;
  no_ask?: number;
  no_ask_dollars?: string;
  last_price?: number;
  last_price_dollars?: string;
  previous_price?: number;
  previous_price_dollars?: string;
  volume?: number;
  volume_24h?: number;
  volume_fp?: string;
  volume_24h_fp?: string;
  liquidity?: number;
  liquidity_dollars?: string;
  open_interest?: number;
  open_interest_fp?: string;
  close_time?: string;
  expected_expiration_time?: string;
  expiration_time?: string;
  latest_expiration_time?: string;
  category?: string;
  image_url?: string;
  event_image_url?: string;
  series_image_url?: string;
  image_url_dark_mode?: string;
  image_url_light_mode?: string;
  logo_url?: string;
  tags?: string[];
  rules_primary?: string;
  rules_secondary?: string;
  [key: string]: unknown;
};

export type KalshiMarketsResponse = {
  markets: KalshiMarket[];
  cursor?: string;
};

export type KalshiCandlestick = {
  end_period_ts?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  close_dollars?: string;
  price?: {
    previous_dollars?: string;
  };
  yes_bid?: KalshiCandleSide;
  yes_ask?: KalshiCandleSide;
  volume?: number;
  [key: string]: unknown;
};

export type KalshiCandleSide = {
  open_dollars?: string;
  high_dollars?: string;
  low_dollars?: string;
  close_dollars?: string;
};

export type KalshiCandlesticksResponse = {
  candlesticks?: KalshiCandlestick[];
  cursor?: string;
  [key: string]: unknown;
};

export type KalshiOrderbookResponse = {
  orderbook?: {
    yes?: [number, number][];
    no?: [number, number][];
  };
  [key: string]: unknown;
};

export type KalshiTradesResponse = {
  trades?: KalshiTrade[];
  cursor?: string;
  [key: string]: unknown;
};

export type KalshiTrade = {
  ticker?: string;
  created_time?: string;
  created_ts?: number;
  count?: number | string;
  count_fp?: string;
  yes_price?: number;
  yes_price_dollars?: string;
  no_price?: number;
  no_price_dollars?: string;
  price?: number | string;
  price_dollars?: string;
  taker_side?: string;
  side?: string;
  trade_type?: string;
  [key: string]: unknown;
};

export type MarketBundle = {
  market: KalshiMarket;
  candlesticks: KalshiCandlestick[];
  orderbook: KalshiOrderbookResponse;
  trades: KalshiTradesResponse;
};
