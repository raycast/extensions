import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { getStations } from "./api/stations-service";
import { StationView } from "./station-view";
import { Station } from "./models/station";

import { useState, useEffect } from "react";

const stations = getStations();

function StationItem({
  station,
  toggleFavorite,
  isFavorite = false,
}: {
  station: Station;
  toggleFavorite: (id: string) => void;
  isFavorite?: boolean;
}) {
  return (
    <List.Item
      title={station.name}
      icon={isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined}
      actions={
        <ActionPanel>
          <Action.Push title="Show Trains" target={<StationView station={station} />} icon={Icon.Train} />
          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            shortcut={Keyboard.Shortcut.Common.Pin}
            icon={Icon.Star}
            onAction={() => toggleFavorite(station.id)}
          />
          <Action.CreateQuicklink
            title="Create Quicklink"
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            icon={Icon.Link}
            quicklink={{
              name: `${station.name} train station`,
              link: createDeeplink({
                command: "departures-and-arrivals",
                context: {
                  stationId: station.id,
                },
              }),
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: { stationId: string } }>) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortedStations, setSortedStations] = useState<{ favorites: Station[]; others: Station[] }>({
    favorites: [],
    others: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const storedFavorites = await LocalStorage.getItem<string>("favorites");
        const favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];

        const favoriteStations = stations.filter((station) => favoriteIds.includes(station.id));
        const otherStations = stations.filter((station) => !favoriteIds.includes(station.id));

        setFavorites(favoriteIds);
        setSortedStations({ favorites: favoriteStations, others: otherStations });
      } catch (error) {
        console.error("Error loading favorites:", error);
        showToast({ style: Toast.Style.Failure, title: "Failed to load favorites" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const toggleFavorite = async (id: string) => {
    const isFavorite = favorites.includes(id);
    const updatedFavorites = isFavorite ? favorites.filter((favId) => favId !== id) : [...favorites, id];

    const updatedFavoriteStations = stations.filter((station) => updatedFavorites.includes(station.id));
    const updatedOtherStations = stations.filter((station) => !updatedFavorites.includes(station.id));

    setFavorites(updatedFavorites);
    setSortedStations({ favorites: updatedFavoriteStations, others: updatedOtherStations });
    await LocalStorage.setItem("favorites", JSON.stringify(updatedFavorites));

    await showToast({
      style: Toast.Style.Success,
      title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
    });
  };

  const { favorites: favoriteStations, others: otherStations } = sortedStations;

  const { push } = useNavigation();

  useEffect(() => {
    if (!isLoading) {
      if (launchContext?.stationId) {
        const station = stations.find((s) => s.id === launchContext?.stationId);
        if (station) {
          push(<StationView station={station} />);
        }
      }
    }
  }, [launchContext?.stationId, isLoading, push]);

  return (
    <List searchBarPlaceholder="Search for a train station" navigationTitle="Select station" isLoading={isLoading}>
      {favoriteStations.length > 0 && (
        <List.Section title="Favorite Stations">
          {favoriteStations.map((station) => (
            <StationItem key={station.id} station={station} toggleFavorite={toggleFavorite} isFavorite />
          ))}
        </List.Section>
      )}
      <List.Section title="Stations">
        {otherStations.map((station) => (
          <StationItem key={station.id} station={station} toggleFavorite={toggleFavorite} />
        ))}
      </List.Section>
    </List>
  );
}
