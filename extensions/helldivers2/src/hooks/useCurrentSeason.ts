import { useFetch } from "./useFetch";

interface WarId {
  id: number;
}

export const useCurrentSeason = () => {
  const { isLoading, data } = useFetch("https://api.live.prod.thehelldiversgame.com/api/WarSeason/current/WarID", {
    headers: {
      cache: "no-cache",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  return { isLoading, warId: (data as WarId | undefined)?.id };
};
