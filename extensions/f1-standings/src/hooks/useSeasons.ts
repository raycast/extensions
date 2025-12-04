import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast } from "@raycast/api";
import { Season, SeasonResponse } from "../types";
import { BASE_API_URL } from "../constants";

const useSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);

  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    async function fetchSeasons() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      try {
        const res = await fetch(`${BASE_API_URL}/f1/seasons.json?limit=100`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as SeasonResponse;
        setSeasons((data?.MRData?.SeasonTable?.Seasons || []).sort((a: Season, b: Season) => b.season - a.season));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load seasons",
        });
        await popToRoot({ clearSearchBar: true });
        setSeasons([]);
      }
    }
    fetchSeasons();
  }, [cancelRef]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return seasons;
};

export default useSeasons;
