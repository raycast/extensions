import { useCurrentSeason } from "./useCurrentSeason";
import { useFetch } from "./useFetch";

interface PlanetStats {
  planetIndex: number;
  missionsWon: number;
  missionsLost: number;
  bugKills: number;
  automatonKills: number;
  illuminateKills: number;
  deaths: number;
  bulletsFired: number;
  bulletsHit: number;
  friendlies: number;
}

interface WarStats {
  planets_stats: PlanetStats[];
}

export const useSummaryStats = () => {
  const { isLoading: isSeasonLoading, warId } = useCurrentSeason();

  const { isLoading, data } = useFetch(
    isSeasonLoading ? undefined : `https://api.live.prod.thehelldiversgame.com/api/Stats/war/${warId}/summary`,
    {
      headers: {
        cache: "no-cache",
        "accept-language": "en-US,en;q=0.9",
      },
    },
  );

  return { isLoading: isLoading || isSeasonLoading, stats: data as WarStats | undefined };
};
