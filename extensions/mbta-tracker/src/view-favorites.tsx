import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { PredictionsList } from "./components/PredictionsList";
import { removeFavoriteStop } from "./lib/stops";
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
            key={`${favorite.route.id}-${favorite.directionId}-${favorite.stop.id}`}
            title={favorite?.stop?.attributes?.name}
            icon={Icon.Star}
            accessories={[
              {
                text: `toward ${favorite?.route?.attributes?.direction_destinations[favorite?.directionId]} via ${
                  favorite?.route?.attributes?.short_name || favorite?.route?.attributes?.long_name
                }`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Departures"
                  icon={Icon.Clock}
                  target={
                    <PredictionsList
                      key={favorite.stop.id}
                      stop={favorite.stop}
                      directionId={favorite.directionId}
                      route={favorite.route}
                      destination={favorite.route.attributes.direction_destinations[favorite.directionId]}
                    />
                  }
                />
                <Action
                  title="Remove Favorite"
                  icon={Icon.StarDisabled}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => {
                    removeFavoriteStop(favorite);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
