import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getProbes, type Probe } from "../api/globalping";
import { getLocationStats, type LocationStat } from "../utils/storage";

interface LocationDirectoryData {
  probes: Probe[];
  recentLocations: LocationStat[];
  preferredLocation?: string;
}

interface RecentLocationsData {
  recentLocations: LocationStat[];
  preferredLocation?: string;
}

function sortRecentLocations(locationStats: LocationStat[]): LocationStat[] {
  return [...locationStats].sort((left, right) => right.lastUsed - left.lastUsed || right.count - left.count);
}

/**
 * Loads recent user locations from local storage for lightweight command startup.
 */
export function useRecentLocations() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const locationStats = await getLocationStats();
      const recentLocations = sortRecentLocations(locationStats);

      return {
        recentLocations,
        preferredLocation: recentLocations[0]?.location,
      } satisfies RecentLocationsData;
    },
    [],
    {
      keepPreviousData: true,
      initialData: {
        recentLocations: [],
        preferredLocation: undefined,
      } satisfies RecentLocationsData,
    },
  );

  return {
    recentLocations: data?.recentLocations ?? [],
    preferredLocation: data?.preferredLocation,
    isLoading,
  };
}

/**
 * Loads the live Globalping probe catalogue plus recent user locations.
 */
export function useLocationDirectory(authToken: string) {
  const [data, setData] = useState<LocationDirectoryData>({
    probes: [],
    recentLocations: [],
    preferredLocation: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let isDisposed = false;

    async function load() {
      try {
        setIsLoading(true);
        const [probes, locationStats] = await Promise.all([
          getProbes(authToken, controller.signal),
          getLocationStats(),
        ]);
        if (isDisposed || controller.signal.aborted) {
          return;
        }

        const recentLocations = sortRecentLocations(locationStats);
        setData({
          probes,
          recentLocations,
          preferredLocation: recentLocations[0]?.location,
        });
      } catch {
        if (isDisposed || controller.signal.aborted) {
          return;
        }

        setData({
          probes: [],
          recentLocations: [],
          preferredLocation: undefined,
        });
      } finally {
        if (!isDisposed && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, [authToken]);

  return {
    probes: data?.probes ?? [],
    recentLocations: data?.recentLocations ?? [],
    preferredLocation: data?.preferredLocation,
    isLoading,
  };
}
