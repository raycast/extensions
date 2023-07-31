import { Icon, List, LocalStorage } from "@raycast/api";
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
          <List.Item
            key={favorite?.stop?.id}
            title={favorite?.stop?.attributes?.name}
            icon={Icon.Star}
            accessories={[
              {
                text: `toward ${favorite?.route?.attributes?.direction_destinations[favorite?.directionId]} via ${
                  favorite?.route?.attributes?.short_name || favorite?.route?.attributes?.long_name
                }`,
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
