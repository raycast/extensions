import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";

import { clearAll, clear, getAll, get, LocalType } from "../lib/localGifs";

import type { StoredGifIds } from "./useGifPopulator";
export interface LocalIdsState {
  ids?: StoredGifIds;
  error?: Error;
}

export interface LoadFavOpt {
  offset?: number;
}

export default function useLocalGifs(type: LocalType) {
  const [isLoadingIds, setIsLoadingIds] = useState(true);
  const [localIds, setLocalIds] = useState<LocalIdsState>();

  const loadRecents = useCallback(
    async function loadFavs(service?: ServiceName, opt?: LoadFavOpt) {
      const { offset = 0 } = opt || {};
      if (!service) {
        return;
      }

      setIsLoadingIds(true);

      try {
        const localIds = await get(service, type);
        setLocalIds({ ids: new Map([[service, localIds]]) });
      } catch (e) {
        console.error(e);
        const error = e as Error;

        await clear(service, type);
        setLocalIds({ error });
      } finally {
        setIsLoadingIds(false);
      }
    },
    [setLocalIds, setIsLoadingIds]
  );

  const loadAllRecents = useCallback(
    async function loadAllFavs(opt?: LoadFavOpt) {
      const { offset = 0 } = opt || {};
      setIsLoadingIds(true);

      try {
        const allFavs = await getAll(type);
        setLocalIds({ ids: allFavs });
      } catch (e) {
        console.error(e);
        const error = e as Error;

        await clearAll(type);
        setLocalIds({ error });
      } finally {
        setIsLoadingIds(false);
      }
    },
    [setLocalIds]
  );

  return [localIds, isLoadingIds, loadRecents, loadAllRecents] as const;
}
