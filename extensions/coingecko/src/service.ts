import axios from 'axios';

import { getPreferredCurrency } from './utils';

type Price = Record<string, Record<string, number>>;

interface PriceResponse {
  prices: [number, number][];
}

const client = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
});

export interface Coin {
  id: string;
  name: string;
  symbol: string;
}

interface CoinInfo {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  links: {
    homepage: string[];
  };
}

interface MarketCapRankedCoinList {
  [key: number]: Coin;
}

export default class Service {
  async getPrice(id: string, currency: string): Promise<number | undefined> {
    const response = await client.get<Price>('/simple/price', {
      params: {
        ids: id,
        vs_currencies: currency,
      },
    });
    if (Object.keys(response.data).length === 0) {
      return;
    }
    const price = response.data[id][currency];
    return price;
  }

  async getCoinInfo(id: string): Promise<CoinInfo> {
    const response = await client.get<CoinInfo>(`coins/${id}`, {
      params: {
        id,
        localization: false,
        tickers: false,
        market_data: false,
        community_data: false,
        developer_data: false,
        sparkline: false,
      },
    });
    return response.data;
  }

  async getCoinList(): Promise<Coin[]> {
    const response = await client.get<Coin[]>('/coins/list');
    return response.data;
  }

  async getTopCoins(currency: string, count: number): Promise<Coin[]> {
    const coins: MarketCapRankedCoinList = {};
    const requests = [];
    const perPage = 250;
    const totalPages = Math.ceil(count / perPage);
    let currentPage = 1;

    while (currentPage < totalPages) {
      requests.push(
        client.get<CoinInfo[]>(
          `/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${perPage}&page=${currentPage}`,
        ),
      );
      currentPage++;
    }

    const results = await Promise.all(requests);

    results.forEach((result) => {
      result.data.forEach(({ id, symbol, name, market_cap_rank }) => {
        coins[market_cap_rank] = { id, symbol, name };
      });
    });

    return Object.values(coins);
  }

  async getCoinPriceHistory(id: string, days = 30) {
    const currency = getPreferredCurrency();
    const response = await client.get<PriceResponse>(
      `/coins/${id}/market_chart`,
      {
        params: {
          vs_currency: currency.id,
          days,
          interval: 'daily',
        },
      },
    );
    return response.data.prices;
  }
}
