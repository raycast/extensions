import { Action, ActionPanel, List, Icon, LocalStorage, showToast, Toast, Color, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStationStatus, getStationInformation } from "./api";

interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_docks_available: number;
  is_renting: number;
  last_reported: number;
}

interface StationInfo {
  station_id: string;
  name: string;
}

interface Station extends StationStatus, StationInfo {
  num_classic_bikes_available: number;
}

export default function Command() {
  const [stations, setStations] = useState<Station[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      const storedFavorites = await LocalStorage.getItem<string>("favorites");
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    }

    loadFavorites();
  }, []);

  useEffect(() => {
    async function loadStations() {
      try {
        const [statusData, infoData] = await Promise.all([getStationStatus(), getStationInformation()]);

        const stationsMap = new Map<string, StationInfo>(infoData.map((info: StationInfo) => [info.station_id, info]));

        const combinedData: Station[] = statusData.map((status: StationStatus) => {
          const stationInfo = stationsMap.get(status.station_id);
          return {
            ...status,
            name: stationInfo?.name || "Unnamed Station",
            num_classic_bikes_available: status.num_bikes_available - status.num_ebikes_available, // To calculate number of classic bikes available, we must subtract available ebikes from total available bikes.
          };
        });

        setStations(combinedData);
      } catch (error: unknown) {
        if (error instanceof Error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load stations",
            message: error.message,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load stations",
            message: "An unknown error occurred.",
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadStations();
  }, [favorites]);

  const addFavorite = async (id: string) => {
    const newFavorites = [...favorites, id];
    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
  };

  const removeFavorite = async (id: string) => {
    const newFavorites = favorites.filter((fav) => fav !== id);
    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
  };

  const favoriteStations = stations.filter((station) => favorites.includes(station.station_id));
  const otherStations = stations.filter(
    (station) => !favorites.includes(station.station_id) && station.is_renting === 1,
  );

  const StationDetail = ({ station }: { station: Station }) => {
    const lastReportedDate = new Date(station.last_reported * 1000);
    const notRentingNote = !station.is_renting ? "\n\n**Note:** This station is not currently renting bikes." : "";
    const stationDetailMarkdown = `
## ${station.name}
- **Classic:** ${station.num_classic_bikes_available}
- **eBikes:** ${station.num_ebikes_available}
- **Docks:** ${station.num_docks_available}
- **Last Reported:** ${lastReportedDate.toLocaleString()}${notRentingNote}
    `;
    return <Detail markdown={stationDetailMarkdown} />;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search stations...">
      <List.Section title="Favorite Stations">
        {favoriteStations.map((station) => (
          <List.Item
            key={station.station_id}
            title={station.name}
            accessories={[
              {
                text: `Classic: ${station.num_classic_bikes_available}`,
                icon: { source: Icon.Bike, tintColor: Color.Green },
              },
              {
                text: `eBikes: ${station.num_ebikes_available}`,
                icon: { source: Icon.Bolt, tintColor: Color.Yellow },
              },
              {
                text: `Docks: ${station.num_docks_available}`,
                icon: { source: Icon.ArrowDownCircle, tintColor: Color.Blue },
              },
              {
                icon: station.is_renting
                  ? { source: Icon.Star, tintColor: Color.Yellow }
                  : { source: Icon.Important, tintColor: Color.Red },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<StationDetail station={station} />} />
                <Action title="Remove From Favorites" onAction={() => removeFavorite(station.station_id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Other Stations">
        {otherStations.map((station) => (
          <List.Item
            key={station.station_id}
            title={station.name}
            accessories={[
              {
                text: `Classic: ${station.num_classic_bikes_available}`,
                icon: { source: Icon.Bike, tintColor: Color.Green },
              },
              {
                text: `eBikes: ${station.num_ebikes_available}`,
                icon: { source: Icon.Bolt, tintColor: Color.Yellow },
              },
              {
                text: `Docks: ${station.num_docks_available}`,
                icon: { source: Icon.ArrowDownCircle, tintColor: Color.Blue },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<StationDetail station={station} />} />
                <Action title="Add to Favorites" onAction={() => addFavorite(station.station_id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
