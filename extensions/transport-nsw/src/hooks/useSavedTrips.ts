import { LocalStorage, Cache } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { SavedTrip } from "../types";

const SAVED_TRIPS_KEY = "savedTrips";
const cache = new Cache();

// Sync to both LocalStorage and Cache
async function persistTrips(trips: SavedTrip[]) {
  const json = JSON.stringify(trips);
  await LocalStorage.setItem(SAVED_TRIPS_KEY, json);
  cache.set(SAVED_TRIPS_KEY, json);
}

export function useSavedTrips() {
  // Try cache first (synchronous), then load from LocalStorage
  const getCachedTrips = (): SavedTrip[] => {
    const cached = cache.get(SAVED_TRIPS_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  };

  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(getCachedTrips);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from LocalStorage on mount (in case AI tool updated it)
  useEffect(() => {
    LocalStorage.getItem<string>(SAVED_TRIPS_KEY).then((stored) => {
      if (stored) {
        try {
          const trips = JSON.parse(stored);
          setSavedTrips(trips);
          cache.set(SAVED_TRIPS_KEY, stored); // Sync to cache
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    });
  }, []);

  const addTrip = useCallback(
    async (trip: Omit<SavedTrip, "id" | "createdAt">) => {
      const newTrip: SavedTrip = {
        ...trip,
        id: `${trip.origin.id}-${trip.destination.id}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const newTrips = [...savedTrips, newTrip];
      setSavedTrips(newTrips);
      await persistTrips(newTrips);
      return newTrip;
    },
    [savedTrips, setSavedTrips],
  );

  const removeTrip = useCallback(
    async (tripId: string) => {
      const newTrips = savedTrips.filter((t) => t.id !== tripId);
      setSavedTrips(newTrips);
      await persistTrips(newTrips);
    },
    [savedTrips, setSavedTrips],
  );

  const isTripSaved = useCallback(
    (originId: string, destinationId: string) => {
      return savedTrips.some((t) => t.origin.id === originId && t.destination.id === destinationId);
    },
    [savedTrips],
  );

  const findTrip = useCallback(
    (originId: string, destinationId: string) => {
      return savedTrips.find((t) => t.origin.id === originId && t.destination.id === destinationId);
    },
    [savedTrips],
  );

  return {
    savedTrips,
    isLoading,
    addTrip,
    removeTrip,
    isTripSaved,
    findTrip,
  };
}
