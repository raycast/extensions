import { AbortError, FetchError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import { ServiceName, GIF_SERVICE } from "../preferences";
import giphy from "../models/giphy";
import tenor from "../models/tenor";
import finergifs from "../models/finergifs";

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
  }

  throw new Error(`Unable to find API for service "${service}"`);
}

export default function useSearchAPI(service: ServiceName, { offset = 0 }) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<FetchState>();
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(term?: string) {
      const api = await getAPIByServiceName(service);

      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      let items: IGif[];
      try {
        if (term) {
          items = await api.search(term, { offset });
        } else {
          items = await api.trending({ offset, limit: 10 });
        }
        setResults({ items, term });
      } catch (e) {
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
    },
    [cancelRef, setIsLoading, setResults]
  );

  useEffect(() => {
    search();
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [results, isLoading, search] as const;
}
