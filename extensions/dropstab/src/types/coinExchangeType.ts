export interface MarketDetail {
  id: number;
  exchangeId: number;
  exchangeName: string;
  exchangeImage: string;
  exchangeSlug: string;
  base: string;
  quote: string;
  price: {
    USD: string;
    BTC: string;
    ETH: string;
    BNB: string;
  };
  volume24h: string;
  link: string;
  verified: boolean;
  marginAvailable: boolean;
  type: string;
  marginLeverage: number | null;
  currencyId: number;
  name: string;
  slug: string;
  image: string | null;
  volumePercent: number;
  volumePercentByCoin: number;
  volumePercentByCoinVerified: number;
  volumePercentByExchange: number;
  updatedAt: number;
  verifiedVolume: boolean;
  tradingViewExcluded: boolean;
  baseCurrencyId: number;
  highlightTradingPoints: number;
  highlightIeoPoints: number;
  quoteFiatId: number | null;
  fakeData: boolean;
}

export interface SearchResult {
  currencyId: number;
  rank: number;
  symbol: string;
  name: string;
  slug: string;
  links: Array<{
    id: number;
    currencyId: number;
    type: string;
    link: string;
    title: string | null;
    decimals: number | null;
    generalType: string;
  }>;
  image: string;
  price: {
    USD: string;
    BTC: string;
    ETH: string;
  };
  marketCap: {
    USD: string;
    BTC: string;
    ETH: string;
  };
  change: number;
  ico: boolean;
  trading: boolean;
  isTradingFinished: boolean;
  markets: MarketDetail[];
}
