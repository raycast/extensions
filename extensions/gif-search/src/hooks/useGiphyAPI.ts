import formatRelative from "date-fns/formatRelative";
import { AbortError, FetchError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import { environment } from "@raycast/api";
import { GiphyFetch } from "@giphy/js-fetch-api";
import type { GifsResult } from "@giphy/js-fetch-api";
import type { IGif as GiphyGif } from "@giphy/js-types";

import { getAPIKey, GIF_SERVICE } from "../preferences";

import type { IGif } from "../models/gif";
interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

let gf: GiphyFetch;
async function getAPI(force?: boolean) {
  if (!gf || force) {
    gf = new GiphyFetch(await getAPIKey(GIF_SERVICE.GIPHY, force));
  }

  return gf;
}

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
        const api = await getAPI();
        if (term) {
          results = await api.search(term, { offset });
        } else {
          results = await api.trending({ offset, limit: 10 });
        }
        setResults({ items: results.data.map(mapGiphyResponse), term });
      } catch (e) {
        const error = e as FetchError;
        if (e instanceof AbortError) {
          return;
        } else if (error.message.toLowerCase().includes("invalid authentication credentials")) {
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

export function mapGiphyResponse(giphyResp: GiphyGif) {
  return <IGif>{
    id: giphyResp.id,
    title: giphyResp.title,
    url: giphyResp.url,
    slug: giphyResp.slug,
    preview_gif_url: giphyResp.images.preview_gif.url,
    gif_url: giphyResp.images.fixed_height.url,
    metadata: {
      width: giphyResp.images.original.width,
      height: giphyResp.images.original.height,
      size: parseInt(giphyResp.images.original.size ?? "", 10) ?? 0,
      labels: [
        { title: "Created", text: formatRelative(new Date(giphyResp.import_datetime), new Date()) },
        giphyResp.username && { title: "User", text: giphyResp.username },
      ],
      links: [giphyResp.source && { title: "Source", text: giphyResp.source_tld, target: giphyResp.source }],
      tags: giphyResp.tags,
    },
    attribution:
      environment.theme === "light" ? "Poweredby_100px-White_VertLogo.png" : "Poweredby_100px-Black_VertLogo.png",
  };
}
