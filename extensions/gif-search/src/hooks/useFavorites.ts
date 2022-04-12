import { AbortError, FetchError } from "node-fetch";
import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";

import dedupe from "../lib/dedupe";
import { clearAllFavorites, clearFavorites, getAllFavorites, getFavorites } from "../lib/favorites";

import type { IGif } from "../models/gif";

type GifIds = Set<string>;

export interface FavIdsState {
  ids?: Map<ServiceName, GifIds>;
  error?: Error;
}

export interface FavItemsState {
  items?: Map<ServiceName, IGif[]>;
  errors?: Error[];
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
        setFavIds({ ids: new Map([[service, faveIds]]) });
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
    async function loadAllFavs() {
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
    [setFavIds, setIsLoadingFavs]
  );

  const populate = useCallback(
    async function populate(ids: GifIds, service?: ServiceName) {
      if (!service || !ids.size) {
        setIsLoadingFavs(false);
        setFavItems({ items: new Map() });
        return;
      }

      setIsLoadingFavs(true);

      const api = await getAPIByServiceName(service);
      if (!api) {
        setFavItems({ items: new Map() });
        setIsLoadingFavs(false);
        return;
      }

      let items: IGif[];
      try {
        items = dedupe(await api.gifs([...ids])).slice(0, limit);

        items.length && setFavItems({ items: new Map([[service, items]]) });
      } catch (e) {
        const error = e as FetchError;
        if (e instanceof AbortError) {
          setIsLoadingFavs(false);
          return;
        } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
          error.message = "Invalid credentials, please try again.";
          await getAPIByServiceName(service, true);
        } else {
          await clearFavorites(service);
        }
        setFavItems({ errors: [error] });
      }

      setIsLoadingFavs(false);
    },
    [setIsLoadingFavs, setFavItems]
  );

  const populateAll = useCallback(
    async function populateAll(allIds: Map<ServiceName, GifIds>) {
      if (!allIds.size) {
        setIsLoadingFavs(false);
        setFavItems({ items: new Map() });
        return;
      }

      setIsLoadingFavs(true);

      const allItems = new Map<ServiceName, IGif[]>();
      const errors: Error[] = [];

      for (const service of allIds.keys()) {
        const api = await getAPIByServiceName(service);
        if (!api) {
          continue;
        }

        let items: IGif[];
        try {
          const ids = allIds.get(service) || new Set<string>();
          items = dedupe(await api.gifs([...ids])).slice(0, limit);

          items.length && allItems.set(service, items);
        } catch (e) {
          const error = e as FetchError;
          if (e instanceof AbortError) {
            break;
          } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
            error.message = "Invalid credentials, please try again.";
            await getAPIByServiceName(service, true);
          } else {
            await clearFavorites(service);
          }
          errors.push(error);
          break;
        }
      }

      if (errors.length) {
        setFavItems({ errors });
      } else {
        setFavItems({ items: allItems });
      }

      setIsLoadingFavs(false);
    },
    [setIsLoadingFavs, setFavItems]
  );

  return [favIds, favItems, isLoadingIds, isLoadingFavs, loadFavs, populate, loadAllFavs, populateAll] as const;
}
