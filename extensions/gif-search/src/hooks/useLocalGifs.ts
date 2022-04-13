import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";

import { clearAll, clear, getAll, get, LocalType } from "../lib/localGifs";

import type { StoredGifIds } from "./useGifPopulator";
export interface FavIdsState {
  ids?: StoredGifIds;
  error?: Error;
}

export interface LoadFavOpt {
  offset?: number;
}

export default function useLocalGifs(type: LocalType) {
  const [isLoadingIds, setIsLoadingIds] = useState(true);
  const [favIds, setFavIds] = useState<FavIdsState>();

  const loadRecents = useCallback(
    async function loadFavs(service?: ServiceName, opt?: LoadFavOpt) {
      const { offset = 0 } = opt || {};
      if (!service) {
        return;
      }

      setIsLoadingIds(true);

      try {
        const favIds = await get(service, type);
        setFavIds({ ids: new Map([[service, favIds]]) });
      } catch (e) {
        console.error(e);
        const error = e as Error;

        await clear(service, type);
        setFavIds({ error });
      } finally {
        setIsLoadingIds(false);
      }
    },
    [setFavIds, setIsLoadingIds]
  );

  const loadAllRecents = useCallback(
    async function loadAllFavs(opt?: LoadFavOpt) {
      const { offset = 0 } = opt || {};
      setIsLoadingIds(true);

      try {
        const allFavs = await getAll(type);
        setFavIds({ ids: allFavs });
      } catch (e) {
        console.error(e);
        const error = e as Error;

        await clearAll(type);
        setFavIds({ error });
      } finally {
        setIsLoadingIds(false);
      }
    },
    [setFavIds]
  );

  return [favIds, isLoadingIds, loadRecents, loadAllRecents] as const;
}
