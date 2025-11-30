import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getStationStatus, getStationInformation, type Station, type StationStatus, type StationInfo } from "./gbfs";
import type { Preferences } from "./constants";

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadStations() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const [statusData, infoData] = await Promise.all([
          getStationStatus(preferences.region),
          getStationInformation(preferences.region),
        ]);

        const stationsMap = new Map<string, StationInfo>(infoData.map((info: StationInfo) => [info.station_id, info]));

        const combinedData: Station[] = statusData.map((status: StationStatus) => {
          const stationInfo = stationsMap.get(status.station_id);
          return {
            ...status,
            ...stationInfo,
            name: stationInfo?.name || "Unnamed Station",
            num_classic_bikes_available: status.num_bikes_available - status.num_ebikes_available,
          };
        });

        setStations(combinedData);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("An unknown error occurred.");
        setError(error);
        showErrorToast(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStations();
  }, []);

  return { stations, isLoading, error };
}

export function useFavorites() {
  const { value: favorites = [], setValue: setFavorites } = useLocalStorage<string[]>("favorites", []);

  const addFavorite = async (id: string) => {
    await setFavorites([...favorites, id]);
  };

  const removeFavorite = async (id: string) => {
    await setFavorites(favorites.filter((fav) => fav !== id));
  };

  return { favorites, addFavorite, removeFavorite };
}

export function usePinnedStation() {
  const { value: pinnedStationId, setValue: setPinnedStationId } = useLocalStorage<string | undefined>("pinnedStation");

  const pinStation = async (stationId: string) => {
    await setPinnedStationId(stationId);
  };

  const unpinStation = async () => {
    await setPinnedStationId(undefined);
  };

  return { pinnedStationId, pinStation, unpinStation };
}

export function showErrorToast(error: Error) {
  showToast({
    style: Toast.Style.Failure,
    title: "Failed to load stations",
    message: error.message,
  });
}
