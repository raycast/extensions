import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "./constants";
import fetch from "node-fetch";
import { useMemo } from "react";
import { showFailureToast } from "@raycast/utils";

export type CoinData = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h?: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  price_change_percentage_24h_in_currency: number;
};

const getCoins = async (page: number): Promise<CoinData[]> => {
  try {
    const response = await fetch(`${apiBaseUrl}/coins?page=${page}`);
    return response.json() as Promise<CoinData[]>;
  } catch (error) {
    showFailureToast("Failed to fetch coins");
    return [];
  }
};

export default function useCoins() {
  const { data: firstPage = [], isLoading: isLoadingFirstPage } = useQuery({
    queryKey: ["coins"],
    queryFn: () => getCoins(1),
    staleTime: 60_000, // 1 minute
  });

  const { data: secondPage = [], isLoading: isLoadingSecondPage } = useQuery({
    queryKey: ["coins", 2],
    queryFn: () => getCoins(2),
    staleTime: 60_000, // 1 minute
  });

  const coins = useMemo(() => {
    const ids = new Set();
    const result = [];
    // the coins are sorted by market cap, so we take the first
    // time a symbol occurs, it will be the version with the highest market cap
    // which is what we want
    for (const coin of firstPage.concat(secondPage)) {
      if (!ids.has(coin.symbol)) {
        result.push(coin);
      }
      ids.add(coin.symbol);
    }
    return result;
  }, [firstPage, secondPage]);

  return { coins, isLoading: isLoadingFirstPage || isLoadingSecondPage };
}
