import Station from "./station";
import useSWR from "swr";
import { IStation } from "../types";
import { List, Toast, showToast, Icon } from "@raycast/api";
import { ReactNode, useState } from "react";
import { addStationToFavorites, getFavoritStations, getStations, removeStationFromFavorites } from "../lib/stations";

interface StationsProps {
  onSelectStation: (station: IStation) => ReactNode;
}

export default function Stations({ onSelectStation }: StationsProps) {
  // Local state
  const [search, setSearch] = useState<string>("");

  // Server state
  const {
    data: stationsData,
    isLoading: isStationsLoading,
    isValidating: isStationsValidating,
  } = useSWR(["stations", search], () => getStations(search), {
    keepPreviousData: true,
    onError: (error) => {
      showToast({
        title: error.response?.data?.title || "Failed to retrieve stations",
        message: error.response?.data?.description,
        style: Toast.Style.Failure,
      });
    },
  });

  const {
    data: favoriteStationsData,
    isLoading: isFavoriteStationsLoading,
    isValidating: isFavoriteStationsValidating,
  } = useSWR("favorite-stations", getFavoritStations);

  return (
    <List
      filtering={false}
      isLoading={isStationsLoading || isStationsValidating || isFavoriteStationsLoading || isFavoriteStationsValidating}
      navigationTitle="Stations"
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search stations"
      throttle
    >
      {stationsData && (
        <List.Section title="All stations">
          {stationsData.map((station, i) => {
            const isFavorite = favoriteStationsData?.some(({ id }) => id === station.id);

            return (
              <Station
                key={[station.name, station.location?.id, station.id, i].join("-")}
                onSelect={onSelectStation}
                onToggleFavorite={isFavorite ? removeStationFromFavorites : addStationToFavorites}
                isFavorite={isFavorite}
                station={station}
              />
            );
          })}
        </List.Section>
      )}

      {favoriteStationsData && (
        <List.Section title="Favorite stations">
          {favoriteStationsData.map((station) => (
            <Station
              isFavorite
              key={["favorites", station.name, station.location?.id, station.id].join("-")}
              onSelect={onSelectStation}
              onToggleFavorite={removeStationFromFavorites}
              station={station}
            />
          ))}
        </List.Section>
      )}

      <List.EmptyView
        icon={Icon.Geopin}
        title={isStationsLoading && search.length >= 3 ? "Loading..." : "No Stations Found"}
        description={
          isStationsLoading && search.length >= 3 ? "Please wait" : "Type at least three charecters to search"
        }
      />
    </List>
  );
}
