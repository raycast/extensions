import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import { mapTenorResponse } from "../models/gif";
import { getAPIKey, GIF_SERVICE } from "../preferences";

import Tenor, { TenorResults } from "../models/tenor";
import type { IGif } from "../models/gif";

interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

const tenor = new Tenor(getAPIKey(GIF_SERVICE.TENOR));

export default function useTenorAPI({ offset = 0 }) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<FetchState>();
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(term?: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      let results: TenorResults;
      try {
        if (term) {
          results = await tenor.search(term, { offset });
        } else {
          results = await tenor.trending({ offset, limit: 10 });
        }
        setResults({ items: results.results.map(mapTenorResponse), term });
      } catch (e) {
        const error = e as Error;
        if (e instanceof AbortError) {
          return;
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
