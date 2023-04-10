import { AbortError, FetchError } from "node-fetch";
import { useCallback, useRef, useState } from "react";

import { ServiceName, GIF_SERVICE } from "../preferences";
import giphy from "../models/giphy";
import tenor from "../models/tenor";
import finergifs from "../models/finergifs";

import dedupe from "../lib/dedupe";

import type { IGif } from "../models/gif";

interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

export async function getAPIByServiceName(service: ServiceName, force?: boolean) {
  switch (service) {
    case GIF_SERVICE.GIPHY:
      return await giphy(force);
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

export default function useSearchAPI({ offset = 0, limit }: { offset?: number; limit?: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<FetchState>();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(term: string, service: ServiceName) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      let items: IGif[];
      try {
        const api = await getAPIByServiceName(service);
        if (api === null) {
          setResults({ items: [] });
          setIsLoading(false);
          return;
        }

        if (term) {
          items = dedupe(await api.search(term, { offset, limit }));
        } else {
          items = dedupe(await api.trending({ offset, limit }));
        }

        setResults({ items, term });
      } catch (e) {
        console.error(e);
        const error = e as FetchError;
        if (e instanceof AbortError) {
          return;
        } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
          error.message = "Invalid credentials, please try again.";
          await getAPIByServiceName(service, true);
        }
        setResults({ error });
      } finally {
        setIsLoading(false);
      }

      return () => {
        cancelRef.current?.abort();
      };
    },
    [cancelRef, setIsLoading, setResults, searchTerm, results]
  );

  return [results, isLoading, setSearchTerm, searchTerm, search] as const;
}
