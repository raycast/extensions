import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const key = "favoriteSubreddits";

const useFavoriteSubreddits = () => {
  const [favoriteSubreddits, setFavoriteSubreddits] = useState<string[]>([]);

  const addSubreddit = async (subreddit: string) => {
    const item = await LocalStorage.getItem<string>(key);

    const favorites: string[] = !item ? [] : JSON.parse(item.toString());
    if (favorites.some((x) => x === subreddit)) {
      return;
    }

    favorites.push(subreddit);
    await LocalStorage.setItem(key, JSON.stringify(favorites));
    setFavoriteSubreddits(favorites);
  };

  const removeSubreddit = async (subreddit: string) => {
    const item = await LocalStorage.getItem<string>(key);

    const favorites: string[] = !item ? [] : JSON.parse(item.toString());
    if (!favorites.some((x) => x === subreddit)) {
      return;
    }

    const index = favorites.indexOf(subreddit);
    const newFavorites = [...favorites.slice(0, index), ...favorites.slice(index + 1)];
    await LocalStorage.setItem(key, JSON.stringify(newFavorites));
    setFavoriteSubreddits(newFavorites);
  };

  useEffect(() => {
    const getFavoriteSubreddits = async () => {
      const item = await LocalStorage.getItem<string>(key);
      if (!item) {
        setFavoriteSubreddits([]);
        return;
      }

      const favorites: string[] = JSON.parse(item.toString());
      setFavoriteSubreddits(favorites);
    };

    getFavoriteSubreddits();
  }, []);

  return [favoriteSubreddits, addSubreddit, removeSubreddit] as const;
};

export default useFavoriteSubreddits;
