export type ResultData = {
  data: {
    cryptoCurrencyMap: CryptoCurrency[];
  };
  status: {
    timestamp: string;
  };
};

export type CryptoCurrency = {
  name: string;
  slug: string;
  symbol: string;
};

export type PriceData = {
  currencyPrice: string;
  priceDiff: string;
  isUp: boolean;
};
