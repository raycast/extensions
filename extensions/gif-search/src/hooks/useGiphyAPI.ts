import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import { GiphyFetch } from "@giphy/js-fetch-api";
import type { GifsResult } from "@giphy/js-fetch-api";

import { mapGiphyResponse } from "../models/gif";
import { getAPIKey, GIF_SERVICE } from "../preferences";

import type { IGif } from "../models/gif";
interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

const gf = new GiphyFetch(getAPIKey(GIF_SERVICE.GIPHY));

export default function useGiphyAPI({ offset = 0 }) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<FetchState>();
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(term?: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      let results: GifsResult;
      try {
        if (term) {
          results = await gf.search(term, { offset });
        } else {
          results = await gf.trending({ offset, limit: 10 });
        }
        setResults({ items: results.data.map(mapGiphyResponse), term });
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
