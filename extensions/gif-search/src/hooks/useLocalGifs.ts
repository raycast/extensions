import { useCachedPromise } from "@raycast/utils";
import { LocalType, get, getAll } from "../lib/localGifs";
import { GRID_COLUMNS, ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";
import dedupe from "../lib/dedupe";

type ItemSize = "small" | "medium" | "large";

export default function useLocalGifs(service?: ServiceName, itemSize?: ItemSize) {
  const isAllFavsOrRecents = service === "favorites" || service === "recents";

  const {
    data: localGifs,
    isLoading: isLoadingLocalGifs,
    mutate: mutateLocalGifs,
  } = useCachedPromise(
    async (service) => {
      if (!service) return [];

      const favs = await get(service, "favs");
      const recent = (await get(service, "recent")).filter((id) => !favs.includes(id));

      // Display the first 2 rows only
      const favIds = Array.from(favs).slice(0, GRID_COLUMNS[itemSize ?? "medium"] * 2);
      const recentIds = Array.from(recent).slice(0, GRID_COLUMNS[itemSize ?? "medium"] * 2);

      const api = await getAPIByServiceName(service);
      if (api === null) return [];

      const [favoriteGifs, recentGifs] = await Promise.all([api.gifs(favIds), api.gifs(recentIds)]);
      return { recentGifs: dedupe(recentGifs), favoriteGifs: dedupe(favoriteGifs) };
    },
    [service],
    { execute: !isAllFavsOrRecents },
  );

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
    isAllFavsOrRecents ? mutateAllGifs() : mutateLocalGifs();
  }

  return {
    favoriteGifs: localGifs && "favoriteGifs" in localGifs ? localGifs.favoriteGifs : [],
    recentGifs: localGifs && "recentGifs" in localGifs ? localGifs.recentGifs : [],
    isLoading: isLoadingLocalGifs || isLoadingAllGifs,
    allGifs,
    mutate,
  };
}
