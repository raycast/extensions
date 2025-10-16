import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { useList } from "react-use";

export function useFavorites() {
  const [favs, actions] = useList<Favorite>([]);
  const [isLoading, setLoading] = useState(true);

  async function updateAndSaveFavs(favs: Favorite[]): Promise<void> {
    await LocalStorage.setItem("favorites", JSON.stringify(favs));
    actions.set(favs);
  }

  async function init() {
    const myFavs = await LocalStorage.getItem("favorites");
    if (myFavs) {
      actions.set(JSON.parse(myFavs.toString()));
    } else {
      await updateAndSaveFavs([]);
    }
  }

  useEffect(() => {
    init().then(() => setLoading(false));
  }, []);

  return { favorites: favs, isLoading, updateAndSaveFavs };
}
