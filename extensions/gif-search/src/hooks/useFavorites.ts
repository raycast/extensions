import { AbortError, FetchError } from "node-fetch";
import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";

import dedupe from "../lib/dedupe";
import { getFavorites } from "../lib/favorites";

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
  const [isLoading, setIsLoading] = useState(true);
  const [favIds, setFavIds] = useState<FavIdsState>();
  const [favItems, setFavItems] = useState<FavItemsState>();

  const loadFavs = useCallback(
    async function loadFavs(service?: ServiceName) {
      if (!service) {
        return;
      }

      setIsLoading(true);

      try {
        const faveIds = await getFavorites(service);
        setFavIds({ ids: faveIds });
      } catch (e) {
        const error = e as Error;
        setFavIds({ error });
      } finally {
        setIsLoading(false);
      }
    },
    [setFavIds, setIsLoading]
  );

  const populate = useCallback(
    async function populate(ids: Set<string>, service?: ServiceName) {
      if (!service) {
        return;
      }

      setIsLoading(true);

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
        }
        setFavItems({ error });
      }

      setIsLoading(false);
    },
    [setIsLoading, setFavItems]
  );

  return [favIds, favItems, isLoading, loadFavs, populate] as const;
}
