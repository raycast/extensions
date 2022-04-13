import { AbortError, FetchError } from "node-fetch";
import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";

import dedupe from "../lib/dedupe";
import { clearFavorites } from "../lib/favorites";

import type { IGif } from "../models/gif";

export type GifIds = Set<string>;

export interface FavItemsState {
  items?: Map<ServiceName, IGif[]>;
  errors?: Error[];
}

export interface LocalOpt {
  offset?: number;
  limit?: number;
  reverse?: boolean;
}

export default function useLocalGifs() {
  const [isLoadingFavs, setIsLoadingFavs] = useState(true);
  const [favItems, setFavItems] = useState<FavItemsState>();

  const populate = useCallback(
    async function populate(ids: GifIds, service?: ServiceName, opt?: LocalOpt) {
      const { offset = 0, limit, reverse } = opt || {};

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
        let idsArr = [...ids];
        if (reverse) {
          idsArr.reverse()
        }
        if (limit) {
          idsArr = idsArr.slice(0, limit - 1);
        }

        items = dedupe(await api.gifs(idsArr));
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
    async function populateAll(allIds: Map<ServiceName, GifIds>, opt?: LocalOpt) {
      const { offset = 0, limit, reverse } = opt || {};

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
          let ids = [...(allIds.get(service) || new Set<string>())];
          if (reverse) {
            ids.reverse();
          }
          if (limit) {
            ids = ids.slice(0, limit - 1);
          }

          items = dedupe(await api.gifs(ids));
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

  return [favItems, isLoadingFavs, populate, populateAll] as const;
}
