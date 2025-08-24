import { useCurrentSeason } from "./useCurrentSeason";
import { useFetch } from "./useFetch";

interface PlanetInfo {
  index: number;
  maxHealth: number;
}

interface WarInfo {
  warId: number;
  startDate: number;
  endDate: number;
  planetInfos: PlanetInfo[];
}

export const useWarInfo = () => {
  const { isLoading: isSeasonLoading, warId } = useCurrentSeason();

  const { isLoading, data } = useFetch(
    isSeasonLoading ? undefined : `https://api.live.prod.thehelldiversgame.com/api/WarSeason/${warId}/WarInfo`,
    {
      headers: {
        cache: "no-cache",
        "accept-language": "en-US,en;q=0.9",
      },
    },
  );

  return { isLoading: isLoading || isSeasonLoading, info: data as WarInfo | undefined };
};
