import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { popToRoot, showToast, Toast } from "@raycast/api";

interface Season {
  season: number;
  url: string;
}

export const useSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const res = await fetch("https://ergast.com/api/f1/seasons.json?limit=100");
        const data = (await res.json()) as any;
        setSeasons((data?.MRData?.SeasonTable?.Seasons || []).sort((a: Season, b: Season) => b.season - a.season));
      } catch (error) {
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
  }, []);

  return seasons;
};
