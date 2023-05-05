export interface TickerToken {
  id: string;
  symbol: string;
  name: string;
}

export interface Token {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  asset_platform_id: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: {
      [currency: string]: number;
    };
    market_cap: {
      [currency: string]: number;
    };
    price_change_percentage_1h_in_currency: {
      [currency: string]: number;
    };
    price_change_percentage_24h_in_currency: {
      [currency: string]: number;
    };
    price_change_percentage_7d_in_currency: {
      [currency: string]: number;
    };
  };
  tickers: {
    base: string;
    target: string;
    last: number;
    coin_id: string;
    target_coin_id: string;
  }[];
  description: {
    [language: string]: string;
  };
}

export interface Preferences {
  "discord-uid": string;
}
