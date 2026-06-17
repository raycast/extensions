import { useCurrentSeason } from "./useCurrentSeason";
import { useFetch } from "./useFetch";

interface PlanetCampaign {
  planetIndex: number;
  type: number;
}

interface PlanetStatus {
  index: number;
  owner: number;
  health: number;
  regenPerSecond: number;
  players: number;
}

interface WarStatus {
  time: number;
  impactMultiplier: number;
  campaigns: PlanetCampaign[];
  planetStatus: PlanetStatus[];
}

export const useWarStatus = () => {
  const { isLoading: isSeasonLoading, warId } = useCurrentSeason();

  const { isLoading, data } = useFetch(
    isSeasonLoading ? undefined : `https://api.live.prod.thehelldiversgame.com/api/WarSeason/${warId}/Status`,
    {
      headers: {
        cache: "no-cache",
        "accept-language": "en-US,en;q=0.9",
      },
    },
  );

  return { isLoading: isLoading || isSeasonLoading, status: data as WarStatus | undefined };
};
