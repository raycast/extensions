import { useCachedPromise } from "@raycast/utils";
import { LocalType, get, getAll } from "../lib/localGifs";
import { GRID_COLUMNS, ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";
import dedupe from "../lib/dedupe";

type ItemSize = "small" | "medium" | "large";

async function getLocalGifs(type: LocalType, service?: ServiceName, itemSize?: ItemSize) {
  if (!service) return [];

  const recent = await get(service, type);
  // Display the first 2 rows only
  const ids = Array.from(recent).slice(0, GRID_COLUMNS[itemSize ?? "medium"] * 2);

  const api = await getAPIByServiceName(service);
  if (api === null) return [];

  const gifs = await api.gifs(ids);
  return dedupe(gifs);
}

export default function useLocalGifs(service?: ServiceName, itemSize?: ItemSize) {
  const isAllFavsOrRecents = service === "favorites" || service === "recents";

  const {
    data: recentGifs,
    isLoading: isLoadingRecentGifs,
    mutate: mutateRecentGifs,
  } = useCachedPromise((service) => getLocalGifs("recent", service, itemSize), [service], {
    execute: !isAllFavsOrRecents,
  });

  const {
    data: favoriteGifs,
    isLoading: isLoadingFavoriteGifs,
    mutate: mutateFavoriteGifs,
  } = useCachedPromise((service) => getLocalGifs("favs", service, itemSize), [service], {
    execute: !isAllFavsOrRecents,
  });

  const {
    data: allGifs,
    isLoading: isLoadingAllGifs,
    mutate: mutateAllGifs,
  } = useCachedPromise(
    async (service?: ServiceName) => {
      let type: LocalType;
      if (service === "favorites") type = "favs";
      else if (service === "recents") type = "recent";
      else return [];

      const all = await getAll(type);
      // Populate all gifs using the API
      const promises = all.map(async ([service, ids]) => {
        const api = await getAPIByServiceName(service);
        if (api === null) return [];
        const gifs = await api.gifs(ids);
        return [service, dedupe(gifs)] as const;
      });

      const results = await Promise.all(promises);
      return results;
    },
    [service],
    { execute: isAllFavsOrRecents },
  );

  async function mutate() {
    if (service === "favorites" || service === "recents") {
      return mutateAllGifs();
    }
    mutateRecentGifs();
    mutateFavoriteGifs();
  }

  return {
    recentGifs,
    favoriteGifs,
    allGifs,
    isLoading: isLoadingRecentGifs || isLoadingFavoriteGifs || isLoadingAllGifs,
    mutate,
  };
}
