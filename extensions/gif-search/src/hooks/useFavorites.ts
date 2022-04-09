import { AbortError, FetchError } from "node-fetch";
import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";

import dedupe from "../lib/dedupe";
import { clearFavorites, getFavorites } from "../lib/favorites";

import type { IGif } from "../models/gif";

export interface FavIdsState {
  ids?: Set<string>;
  error?: Error;
}

export interface FavItemsState {
  items?: IGif[];
  error?: Error;
}

const DEFAULT_RESULT_COUNT = 10;

export default function useFavorites({ offset = 0, limit = DEFAULT_RESULT_COUNT }) {
  const [isLoadingIds, setIsLoadingIds] = useState(true);
  const [favIds, setFavIds] = useState<FavIdsState>();

  const [isLoadingFavs, setIsLoadingFavs] = useState(true);
  const [favItems, setFavItems] = useState<FavItemsState>();

  const loadFavs = useCallback(
    async function loadFavs(service?: ServiceName) {
      if (!service) {
        return;
      }

      setIsLoadingIds(true);

      try {
        const faveIds = await getFavorites(service);
        setFavIds({ ids: faveIds });
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

  const populate = useCallback(
    async function populate(ids: Set<string>, service?: ServiceName) {
      setIsLoadingFavs(true);

      if (!service || !ids.size) {
        setFavItems({ items: [] });
        setIsLoadingFavs(false);
        return;
      }

      const api = await getAPIByServiceName(service);

      let items: IGif[];
      try {
        items = dedupe(await api.gifs([...ids])).slice(0, limit);
        items?.forEach((item) => (item.is_fav = !!ids?.has(item.id.toString())));

        setFavItems({ items });
      } catch (e) {
        const error = e as FetchError;
        if (e instanceof AbortError) {
          return;
        } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
          error.message = "Invalid credentials, please try again.";
          await getAPIByServiceName(service, true);
        } else {
          await clearFavorites(service);
        }
        setFavItems({ error });
      }

      setIsLoadingFavs(false);
    },
    [setIsLoadingFavs, setFavItems]
  );

  return [favIds, favItems, isLoadingIds, isLoadingFavs, loadFavs, populate] as const;
}
