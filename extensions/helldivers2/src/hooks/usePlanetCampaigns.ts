import { campaignTypes } from "../data/campaignTypes";
import { planets } from "../data/planets";
import { useSummaryStats } from "./useSummaryStats";
import { useWarInfo } from "./useWarInfo";
import { useWarStatus } from "./useWarStatus";

export const usePlanetCampaigns = () => {
  const { isLoading: isInfoLoading, info } = useWarInfo();
  const { isLoading: isStatsLoading, stats } = useSummaryStats();
  const { isLoading: isStatusLoading, status } = useWarStatus();

  if (!stats || !info) return { isLoading: true, campaigns: [] };

  const campaigns = status?.campaigns
    .flatMap((planet) => {
      const planetData = planets[planet.planetIndex.toString()];
      const planetStatus = status.planetStatus.find((status) => status.index === planet.planetIndex);
      const planetInfo = info.planetInfos.find((info) => info.index === planet.planetIndex);
      const planetStats = stats.planets_stats.find((stats) => stats.planetIndex === planet.planetIndex);

      if (!planetData || !planetStatus || !planetInfo || !planetStats) return [];

      return {
        ...planet,
        planet: planetData,
        status: planetStatus,
        info: planetInfo,
        stats: planetStats,
        campaignType: campaignTypes[planet.type.toString()],
      };
    })
    .toSorted((a, b) => a.status.players - b.status.players)
    .reverse();

  return { isLoading: isStatusLoading || isStatsLoading || isInfoLoading, campaigns };
};
