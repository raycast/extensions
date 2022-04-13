import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";

import { clearAllFavorites, clearFavorites, getAllFavorites, getFavorites } from "../lib/favorites";

type GifIds = Set<string>;

export interface FavIdsState {
  ids?: Map<ServiceName, GifIds>;
  error?: Error;
}

export interface LoadFavOpt {
  offset?: number;
}

export default function useFavorites() {
  const [isLoadingIds, setIsLoadingIds] = useState(true);
  const [favIds, setFavIds] = useState<FavIdsState>();

  const loadFavs = useCallback(
    async function loadFavs(service?: ServiceName, opt?: LoadFavOpt) {
      const { offset = 0 } = opt || {};
      if (!service) {
        return;
      }

      setIsLoadingIds(true);

      try {
        const favIds = await getFavorites(service);
        setFavIds({ ids: new Map([[service, favIds]]) });
      } catch (e) {
        console.error(e);
        const error = e as Error;

        await clearFavorites(service);
        setFavIds({ error });
      } finally {
        setIsLoadingIds(false);
      }
    },
    [setFavIds, setIsLoadingIds]
  );

  const loadAllFavs = useCallback(
    async function loadAllFavs(opt?: LoadFavOpt) {
      const { offset = 0 } = opt || {};
      setIsLoadingIds(true);

      try {
        const allFavs = await getAllFavorites();
        setFavIds({ ids: allFavs });
      } catch (e) {
        console.error(e);
        const error = e as Error;

        await clearAllFavorites();
        setFavIds({ error });
      } finally {
        setIsLoadingIds(false);
      }
    },
    [setFavIds]
  );

  return [favIds, isLoadingIds, loadFavs, loadAllFavs] as const;
}
