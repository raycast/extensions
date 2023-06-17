export interface ICoinCompareResult {
  data: ICoinCompareData;
}

export interface ICoinCompareData {
  base_coin: IBaseCoin;
  target_coin: IBaseCoin;
  ratios: number[];
  times: string[];
  base_coin_suggestions: ICoinSuggestion[];
  target_coin_suggestions: ICoinSuggestion[];
  from: string;
  to: string;
}

export interface ICoinSuggestion {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  most_popular: boolean;
  detail_platforms: string;
}

export interface IBaseCoin {
  id: string;
  name: string;
  symbol: string;
  asset_platform_id: string;
  platforms: Platforms;
  block_time_in_minutes: number;
  categories: string[];
  localization: Localization;
  description: Localization;
  links: Links;
  image: Image;
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  watchlist_users: number;
  market_cap_rank: number;
  coingecko_rank: number;
  coingecko_score: number;
  market_data: MarketData;
  tickers: Ticker[];
  contract_address: string;
  detail_platforms: DetailPlatforms;
}

export interface Platforms {
  ethereum: string;
}

export interface Localization {
  ar: string;
  bg: string;
  cs: string;
  da: string;
  de: string;
  el: string;
  en: string;
  es: string;
  fi: string;
  fr: string;
  he: string;
  hi: string;
  hr: string;
  hu: string;
  id: string;
  it: string;
  ja: string;
  ko: string;
  lt: string;
  nl: string;
  no: string;
  pl: string;
  pt: string;
  ro: string;
  ru: string;
  sk: string;
  sl: string;
  sv: string;
  th: string;
  tr: string;
  uk: string;
  vi: string;
  zh: string;
  "zh-tw": string;
}

export interface Links {
  announcement_url: string[];
  blockchain_site: string[];
  chat_url: string[];
  facebook_username: string;
  homepage: string[];
  official_forum_url: string[];
  telegram_channel_identifier: string;
  twitter_screen_name: string;
}

export interface Image {
  thumb: string;
  small: string;
  large: string;
}

export interface MarketData {
  current_price: CurrentPrice;
  ath_change_percentage: CurrentPrice;
  atl: CurrentPrice;
  market_cap: CurrentPrice;
  market_cap_rank: number;
  total_volume: CurrentPrice;
  fully_diluted_valuation: CurrentPrice;
  high_24h: CurrentPrice;
  low_24h: CurrentPrice;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_14d: number;
  price_change_percentage_30d: number;
  price_change_percentage_60d: number;
  price_change_percentage_200d: number;
  price_change_percentage_1y: number;
  price_change_24h_in_currency: CurrentPrice;
  price_change_percentage_1h_in_currency: CurrentPrice;
  price_change_percentage_24h_in_currency: CurrentPrice;
  price_change_percentage_7d_in_currency: CurrentPrice;
  price_change_percentage_14d_in_currency: CurrentPrice;
  price_change_percentage_30d_in_currency: CurrentPrice;
  price_change_percentage_60d_in_currency: CurrentPrice;
  price_change_percentage_200d_in_currency: CurrentPrice;
  price_change_percentage_1y_in_currency: CurrentPrice;
  market_cap_change_24h_in_currency: CurrentPrice;
  market_cap_change_percentage_24h_in_currency: CurrentPrice;
  total_supply: number;
  max_supply: number;
  circulating_supply: number;
}

export interface CurrentPrice {
  aed: number;
  ars: number;
  aud: number;
  bch: number;
  bdt: number;
  bhd: number;
  bits: number;
  bmd: number;
  bnb: number;
  brl: number;
  btc: number;
  cad: number;
  chf: number;
  clp: number;
  cny: number;
  czk: number;
  dkk: number;
  dot: number;
  eos: number;
  eth: number;
  eur: number;
  gbp: number;
  hkd: number;
  huf: number;
  idr: number;
  ils: number;
  inr: number;
  jpy: number;
  krw: number;
  kwd: number;
  link: number;
  lkr: number;
  ltc: number;
  mmk: number;
  mxn: number;
  myr: number;
  ngn: number;
  nok: number;
  nzd: number;
  php: number;
  pkr: number;
  pln: number;
  rub: number;
  sar: number;
  sats: number;
  sek: number;
  sgd: number;
  thb: number;
  try: number;
  twd: number;
  uah: number;
  usd: number;
  vef: number;
  vnd: number;
  xag: number;
  xau: number;
  xdr: number;
  xlm: number;
  xrp: number;
  yfi: number;
  zar: number;
}

export interface Ticker {
  base: string;
  target: string;
  last: number;
  coin_id: string;
  target_coin_id: string;
}

export interface DetailPlatforms {
  ethereum: Ethereum;
}

export interface Ethereum {
  decimal_place: number;
  contract_address: string;
}

export interface ITickerResp {
  markdown: string;
  base_coin: ITickerBaseCoin;
}

export interface ITickerBaseCoin {
  id: string;
  symbol: string;
  image: string;
  name: string;
  asset_platform_id: string;
  description: string;
  market_data: ITickerMarketData;
}

export interface ITickerMarketData extends ITickerBaseCoin {
  current_price: number;
  market_cap: number;
  market_cap_rank?: number;
  sparkline_in_7d?: IPrice;
  percentage_1h: number;
  percentage_24h: number;
  percentage_7d: number;
  is_pair?: boolean;
  is_default?: boolean;
}

export interface IPrice {
  price: number[];
}

export interface ICoinQueryResp {
  data: ICoinQueryData[];
}

export interface ICoinQueryData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  most_popular: boolean;
  detail_platforms: string;
}

export interface IMarketDataResp {
  data: IMarketData[];
}

export interface IMarketData extends ITickerBaseCoin {
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h_in_currency: number;
  is_pair: boolean;
  is_default: boolean;
}
