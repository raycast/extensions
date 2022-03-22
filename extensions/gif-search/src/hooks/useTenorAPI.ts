import path from "path";
import { AbortError, FetchError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import { getAPIKey, GIF_SERVICE } from "../preferences";

import TenorAPI, { TenorResults } from "../models/tenor";
import type { TenorGif } from "../models/tenor";
import type { IGif } from "../models/gif";

interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

let tenor: TenorAPI;
async function getAPI(force?: boolean) {
  if (!tenor || force) {
    tenor = new TenorAPI(await getAPIKey(GIF_SERVICE.TENOR, force));
  }

  return tenor;
}

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
        const api = await getAPI();
        if (term) {
          results = await api.search(term, { offset });
        } else {
          results = await api.trending({ offset, limit: 10 });
        }
        setResults({ items: results.results.map(mapTenorResponse), term });
      } catch (e) {
        const error = e as FetchError;
        if (e instanceof AbortError) {
          return;
        } else if (error.code == "401") {
          error.message = "Invalid credentials, please try again.";
          await getAPI(true);
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

export function mapTenorResponse(tenorResp: TenorGif) {
  const mediaItem = tenorResp.media[0];
  return <IGif>{
    id: tenorResp.id,
    title: tenorResp.title || tenorResp.h1_title || tenorResp.content_description,
    url: tenorResp.itemurl,
    slug: path.basename(tenorResp.itemurl),
    preview_gif_url: mediaItem.tinygif.preview,
    gif_url: mediaItem.tinygif.url,
    attribution: "poweredby_tenor.png",
  };
}
