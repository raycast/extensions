import { AbortError, FetchError } from "node-fetch";
import { useCallback, useState } from "react";

import { ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";

import dedupe from "../lib/dedupe";
import { clear } from "../lib/localGifs";

import type { IGif } from "../models/gif";

export type GifIds = Set<string>;
export type StoredGifIds = Map<ServiceName, GifIds>;

export interface FavItemsState {
  items?: Map<ServiceName, IGif[]>;
  errors?: Error[];
}

export interface LocalOpt {
  offset?: number;
  limit?: number;
  reverse?: boolean;
}

export default function useGifPopulator() {
  const [isLoadingGifs, setIsLoadingGifs] = useState(true);
  const [items, setItems] = useState<FavItemsState>();

  const populate = useCallback(
    async function populate(ids: GifIds, service?: ServiceName, opt?: LocalOpt) {
      const { offset = 0, limit, reverse } = opt || {};

      if (!service || !ids.size) {
        setIsLoadingGifs(false);
        setItems({ items: new Map() });
        return;
      }

      setIsLoadingGifs(true);

      const api = await getAPIByServiceName(service);
      if (!api) {
        setItems({ items: new Map() });
        setIsLoadingGifs(false);
        return;
      }

      let items: IGif[];
      try {
        let idsArr = [...ids];
        if (reverse) {
          idsArr.reverse();
        }
        if (limit) {
          idsArr = idsArr.slice(0, limit - 1);
        }

        items = dedupe(await api.gifs(idsArr));
        items.length && setItems({ items: new Map([[service, items]]) });
      } catch (e) {
        const error = e as FetchError;
        if (e instanceof AbortError) {
          setIsLoadingGifs(false);
          return;
        } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
          error.message = "Invalid credentials, please try again.";
          await getAPIByServiceName(service, true);
        } else {
          await clear(service, "favs");
        }
        setItems({ errors: [error] });
      }

      setIsLoadingGifs(false);
    },
    [setIsLoadingGifs, setItems]
  );

  const populateAll = useCallback(
    async function populateAll(allIds: Map<ServiceName, GifIds>, opt?: LocalOpt) {
      const { offset = 0, limit, reverse } = opt || {};

      if (!allIds.size) {
        setIsLoadingGifs(false);
        setItems({ items: new Map() });
        return;
      }

      setIsLoadingGifs(true);

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
            await clear(service, "favs");
          }
          errors.push(error);
          break;
        }
      }

      if (errors.length) {
        setItems({ errors });
      } else {
        setItems({ items: allItems });
      }

      setIsLoadingGifs(false);
    },
    [setIsLoadingGifs, setItems]
  );

  return [items, isLoadingGifs, populate, populateAll] as const;
}
