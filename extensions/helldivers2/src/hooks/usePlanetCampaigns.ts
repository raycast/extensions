import { campaignTypes } from "../data/campaignTypes";
import { planets } from "../data/planets";
import { useSummaryStats } from "./useSummaryStats";
import { useWarInfo } from "./useWarInfo";
import { useWarStatus } from "./useWarStatus";

export const usePlanetCampaigns = () => {
  const { isLoading: isInfoLoading, info } = useWarInfo();
  const { isLoading: isStatsLoading, stats } = useSummaryStats();
  const { isLoading: isStatusLoading, status } = useWarStatus();

  if (stats == undefined || info == undefined) return { isLoading: true, campaigns: [] };

  const campaigns = status?.campaigns
    .map((planet) => {
      const planetStatus = status.planetStatus.find((status) => status.index == planet.planetIndex)!;
      const planetInfo = info.planetInfos.find((info) => info.index == planet.planetIndex)!;
      const planetStats = stats.planets_stats.find((stats) => stats.planetIndex == planet.planetIndex)!;

      return {
        ...planet,
        planet: planets[planet.planetIndex.toString()],
        status: planetStatus,
        info: planetInfo,
        stats: planetStats,
        campaignType: campaignTypes[planet.type.toString()],
      };
    })
    .toSorted((a, b) => a.status.players - b.status.players);

  return { isLoading: isStatusLoading || isStatsLoading || isInfoLoading, campaigns };
};
