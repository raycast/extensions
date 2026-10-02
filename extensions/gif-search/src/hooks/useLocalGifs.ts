import { useCachedPromise } from "@raycast/utils";
import { LocalType, get, getAll } from "../lib/localGifs";
import { showToast, Toast } from "@raycast/api";
import { GRID_COLUMNS, ServiceName, getServiceTitle } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";
import dedupe from "../lib/dedupe";
import { IGif } from "../models/gif";

type ItemSize = "small" | "medium" | "large";

type ResolvedGifs = readonly [ServiceName, IGif[]];
type ProviderFailure = { service: ServiceName; error: Error };

function isFailure(result: ResolvedGifs | ProviderFailure): result is ProviderFailure {
  return "error" in result;
}

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
      // Empty providers make no lookup and must not count as successful recovery.
      const populatedProviders = all.filter(([, ids]) => ids.length > 0);
      // Populate all gifs using the API
      const promises = populatedProviders.map(async ([service, ids]): Promise<ResolvedGifs | ProviderFailure> => {
        const api = await getAPIByServiceName(service);
        if (api === null) return [service, [] as IGif[]] as const;
        try {
          const gifs = await api.gifs(ids);
          return [service, dedupe(gifs)] as const;
        } catch (error) {
          console.error(`Failed to load saved GIFs for ${service}:`, error);
          return { service, error: error instanceof Error ? error : new Error(String(error)) };
        }
      });

      const results = await Promise.all(promises);
      const failures = results.filter(isFailure);

      // Every populated provider failing looks identical to having saved nothing, and the empty result
      // would be cached over the last good one. Rejecting instead keeps the cached GIFs on
      // screen and gives the hook's own toast a Retry action.
      if (failures.length && failures.length === results.length) {
        throw failures[0].error;
      }

      if (failures.length) {
        const names = failures.map((failure) => getServiceTitle(failure.service)).join(", ");
        await showToast({ style: Toast.Style.Failure, title: `Could not load saved GIFs from ${names}` });
      }

      return results.filter((result): result is ResolvedGifs => !isFailure(result));
    },
    [service],
    { execute: isAllFavsOrRecents },
  );

  async function mutate() {
    await (isAllFavsOrRecents ? mutateAllGifs() : mutateLocalGifs());
  }

  return {
    favoriteGifs: localGifs && "favoriteGifs" in localGifs ? localGifs.favoriteGifs : [],
    recentGifs: localGifs && "recentGifs" in localGifs ? localGifs.recentGifs : [],
    isLoading: isLoadingLocalGifs || isLoadingAllGifs,
    allGifs,
    mutate,
  };
}
