import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage } from "@raycast/api";
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
                text: `${favorite?.route?.attributes?.direction_names[favorite?.directionId]} toward ${
                  favorite?.route?.attributes?.direction_destinations[favorite?.directionId]
                } via ${favorite?.route?.attributes?.short_name || favorite?.route?.attributes?.long_name}`,
              },
              {
                icon: {
                  source: ["Rapid Transit", "Commuter Rail"].includes(favorite?.route?.attributes?.description)
                    ? Icon.Train
                    : Icon.Car,
                  tintColor: favorite.route.attributes.color,
                },
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
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => {
                    removeFavoriteStop(favorite);
                    setFavorites((prevFavorites): Favorite[] => {
                      return prevFavorites.filter((prevFavorite) => {
                        return (
                          prevFavorite.route.id !== favorite.route.id ||
                          prevFavorite.directionId !== favorite.directionId ||
                          prevFavorite.stop.id !== favorite.stop.id
                        );
                      });
                    });
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
