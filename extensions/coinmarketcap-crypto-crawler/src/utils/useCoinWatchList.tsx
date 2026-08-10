import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { CryptoCurrency } from "../types";

const WATCHLIST_KEY = "COINS_WATCHLIST";

async function loadWatchList() {
  const item = await LocalStorage.getItem<string>(WATCHLIST_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as CryptoCurrency[];
  } else {
    return [];
  }
}

async function saveWatchList(coins: CryptoCurrency[]) {
  const data = JSON.stringify(coins);
  await LocalStorage.setItem(WATCHLIST_KEY, data);
}

export async function clearWatchList() {
  return await LocalStorage.removeItem(WATCHLIST_KEY);
}

export default function useCoinWatchlist() {
  const [watchList, setWatchList] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWatchList()
      .then(setWatchList)
      .then(() => setLoading(false));
  }, []);

  const addToWatchList = async (coin: CryptoCurrency) => {
    const coins = [...watchList, coin];

    setWatchList(coins);
    saveWatchList(coins);
  };

  const removeFromWatchList = async (coin: CryptoCurrency) => {
    const coins = watchList.filter((c) => c.slug !== coin.slug);

    saveWatchList(coins);
    setWatchList(coins);
  };

  return {
    watchList,
    addToWatchList,
    removeFromWatchList,
    clearWatchList,
    loading,
  };
}
