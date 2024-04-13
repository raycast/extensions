import { AbortError, FetchError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import { ServiceName, GIF_SERVICE } from "../preferences";
import giphy from "../models/giphy";
import tenor from "../models/tenor";
import finergifs from "../models/finergifs";

import dedupe from "../lib/dedupe";

import type { APIOpt, IGif } from "../models/gif";

interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

export async function getAPIByServiceName(service: ServiceName, force?: boolean) {
  switch (service) {
    case GIF_SERVICE.GIPHY:
      return await giphy(force);
    case GIF_SERVICE.GIPHY_CLIPS:
      return await giphy(force, "videos");
    case GIF_SERVICE.TENOR:
      return await tenor(force);
    case GIF_SERVICE.FINER_GIFS:
      return finergifs();
    case GIF_SERVICE.FAVORITES:
    case GIF_SERVICE.RECENTS:
      return null;
  }

  throw new Error(`Unable to find API for service "${service}"`);
}

export default function useSearchAPI({
  term,
  service,
  limit = 10,
}: {
  term: string;
  service?: ServiceName;
  offset?: number;
  limit?: number;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<FetchState>();
  const [offset, setOffset] = useState(0);
  const prevServiceRef = useRef(service);
  const prevTermRef = useRef(term);
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (searchTerm: string, searchService: ServiceName) => {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      try {
        const api = await getAPIByServiceName(searchService);
        if (api === null) {
          setResults({ items: [] });
          setIsLoading(false);
          return;
        }

        const opts: APIOpt = { offset, limit, abort: cancelRef.current };
        const newItems = searchTerm ? await api.search(searchTerm, opts) : await api.trending(opts);

        if (searchService === prevServiceRef.current && searchTerm === prevTermRef.current) {
          // If neither the service nor the term have changed, append the items
          setResults({ items: dedupe([...(results?.items ?? []), ...newItems]), term: searchTerm });
        } else {
          // If either the service or the term have changed, replace the items
          setResults({ items: dedupe(newItems), term: searchTerm });
          prevServiceRef.current = searchService;
          prevTermRef.current = searchTerm;
        }
      } catch (e) {
        const error = e as FetchError;
        if (e instanceof AbortError) {
          return;
        } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
          error.message = "Invalid credentials, please try again.";
          await getAPIByServiceName(searchService, true);
        }
        console.error(e);
        setResults({ error });
      } finally {
        setIsLoading(false);
      }

      return () => {
        cancelRef.current?.abort();
      };
    },
    [cancelRef, setIsLoading, setResults, term, results, offset],
  );

  const loadMore = () => setOffset(offset + limit);

  useEffect(() => {
    if (!service) {
      return;
    }

    search(term, service);
  }, [offset, term, service]);

  return [results, isLoading, loadMore] as const;
}
