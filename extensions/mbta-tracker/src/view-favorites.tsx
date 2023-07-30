import { List, LocalStorage } from "@raycast/api";
import type { Favorite } from "./types";
import { useEffect, useState } from "react";

export default function Command() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      const favoritesStr = (await LocalStorage.getItem("favorite-stops")) as string;
      const favorites = favoritesStr ? (JSON.parse(favoritesStr) as Favorite[]) : [];

      setFavorites(favorites);
    };

    fetchFavorites();
  }, []);
  return (
    <List>
      <List.Section title="Favorites">
        {favorites.map((favorite: Favorite) => (
          <List.Item key={favorite?.stop?.id} title={favorite?.stop?.attributes?.name} />
        ))}
      </List.Section>
    </List>
  );
}
