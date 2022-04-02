import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

import FinerGifsClubAPI, { FinerGifsClubResults } from "../models/finerthingsclub";
import type { FinerGif } from "../models/finerthingsclub";
import type { IGif } from "../models/gif";

interface FetchState {
  term?: string;
  items?: IGif[];
  error?: Error;
}

const finergifs = new FinerGifsClubAPI();

export default function useFinerGifsClubAPI({ offset = 0 }) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<FetchState>();
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(term?: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      let results: FinerGifsClubResults;
      try {
        if (term) {
          results = await finergifs.search(term, { offset });
          setResults({ items: results.results.map(mapFinerGifsResponse), term });
        } else {
          setResults({ items: [], term });
        }
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

const EPISODE_NUM_REGEX = /^(\d{2})x(\d{2})-.+/i;

export function mapFinerGifsResponse(finerGifsResp: FinerGif) {
  const gifUrl = new URL(finerGifsResp.fields.fileid + ".gif", "https://media.thefinergifs.club");
  const [, season, episode] = finerGifsResp.fields.fileid.match(EPISODE_NUM_REGEX) || new Array(2);
  const epInt = parseInt(season, 10);

  return <IGif>{
    id: finerGifsResp.id,
    title: finerGifsResp.fields.text,
    slug: finerGifsResp.fields.fileid,
    preview_gif_url: gifUrl.toString(),
    gif_url: gifUrl.toString(),
    metadata:
      season || episode
        ? {
            labels: [season && { title: "Season", text: season }, episode && { title: "Episode", text: episode }],
            links: [
              epInt && {
                title: "The TVDB",
                text: `Season ${epInt}`,
                target: `https://thetvdb.com/series/the-office-us/seasons/official/${epInt}`,
              },
            ],
          }
        : undefined,
  };
}
