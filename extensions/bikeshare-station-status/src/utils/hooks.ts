import { LocalStorage, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getStationStatus, getStationInformation, type Station, type StationStatus, type StationInfo } from "./gbfs";
import type { Preferences } from "./constants";

const FAVORITES_KEY = "favorites";
const PINNED_STATION_KEY = "pinnedStation";

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
      } finally {
        setIsLoading(false);
      }
    }

    loadStations();
  }, []);

  return { stations, isLoading, error };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function loadFavorites() {
      const storedFavorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    }
    loadFavorites();
  }, []);

  const addFavorite = useCallback(
    async (id: string) => {
      const newFavorites = [...favorites, id];
      setFavorites(newFavorites);
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    },
    [favorites],
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      const newFavorites = favorites.filter((fav) => fav !== id);
      setFavorites(newFavorites);
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    },
    [favorites],
  );

  return { favorites, addFavorite, removeFavorite };
}

export function usePinnedStation() {
  const [pinnedStationId, setPinnedStationId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPinned() {
      const storedPinned = await LocalStorage.getItem<string>(PINNED_STATION_KEY);
      if (storedPinned) {
        setPinnedStationId(storedPinned);
      }
    }
    loadPinned();
  }, []);

  const pinStation = useCallback(async (stationId: string) => {
    await LocalStorage.setItem(PINNED_STATION_KEY, stationId);
    setPinnedStationId(stationId);
  }, []);

  const unpinStation = useCallback(async () => {
    await LocalStorage.removeItem(PINNED_STATION_KEY);
    setPinnedStationId(null);
  }, []);

  return { pinnedStationId, pinStation, unpinStation };
}

export function showErrorToast(error: Error) {
  showToast({
    style: Toast.Style.Failure,
    title: "Failed to load stations",
    message: error.message,
  });
}
