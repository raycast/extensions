import { useEffect, useState } from "react";
import { setLocalStorageItem, getLocalStorageItem, removeLocalStorageItem } from "@raycast/api";
import { CryptoCurrency } from "../types";

const FAVORITE_COINS_KEY = "FAVORITE_COINS";

async function loadFavoriteCoins() {
  const item = await getLocalStorageItem<string>(FAVORITE_COINS_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as CryptoCurrency[];
  } else {
    return [];
  }
}

async function saveFavoriteCoins(coins: CryptoCurrency[]) {
  const data = JSON.stringify(coins);
  await setLocalStorageItem(FAVORITE_COINS_KEY, data);
}

export async function clearFavoriteCoins() {
  return await removeLocalStorageItem(FAVORITE_COINS_KEY);
}

export default function useFavoriteCoins() {
  const [favoriteCoins, setFavoriteCoins] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavoriteCoins()
      .then(setFavoriteCoins)
      .then(() => setLoading(false));
  }, []);

  const addFavoriteCoin = async (coin: CryptoCurrency) => {
    const coins = [...favoriteCoins, coin];

    setFavoriteCoins(coins);
    saveFavoriteCoins(coins);
  };

  const removeFavoriteCoin = async (coin: CryptoCurrency) => {
    const coins = favoriteCoins.filter((c) => c.slug !== coin.slug);

    saveFavoriteCoins(coins);
    setFavoriteCoins(coins);
  };

  return {
    favoriteCoins,
    addFavoriteCoin,
    removeFavoriteCoin,
    loading,
  };
}
