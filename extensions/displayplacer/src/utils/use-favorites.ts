import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { useList } from "react-use";

export function useFavorites() {
  const [favs, actions] = useList<Favorite>([]);
  const [isLoading, setLoading] = useState(true);

  async function init() {
    const myFavs = await LocalStorage.getItem("favorites");
    if (myFavs) {
      actions.set(JSON.parse(myFavs.toString()));
    } else {
      await LocalStorage.setItem("favorites", "[]");
    }
  }

  useEffect(() => {
    init().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    LocalStorage.setItem("favorites", JSON.stringify(favs));
  }, [favs]);

  return { favorites: favs, isLoading, actions };
}
