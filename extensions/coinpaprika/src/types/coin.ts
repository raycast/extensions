export type Coin = {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  quotes: {
    USD: {
      price: number;
      ath_price: number;
      ath_date: string;
      percent_from_price_ath: string;
      percent_change_1y: string;
      percent_change_24h: string;
      percent_change_7d: string;
      percent_change_30d: string;
      market_cap: number;
    };
    BTC: {
      price: number;
      ath_price: number;
      ath_date: string;
      percent_from_price_ath: string;
      percent_change_1y: string;
      percent_change_24h: string;
      percent_change_7d: string;
      percent_change_30d: string;
      market_cap: number;
    };
  };
  // possibility to limit number of coins due to the performance
  slice(number: number, number2: number): ((prevState: Coin[]) => Coin[]) | Coin[];
};

export type CoinId = {
  coinId: string;
};
