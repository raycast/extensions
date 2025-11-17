import { useCachedPromise } from "@raycast/utils";
import type { MatchDetailData } from "@/types/match-detail";
import { getHeaderToken } from "@/utils/token";

export function useMatchDetail(matchId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (matchId: string): Promise<MatchDetailData> => {
      const url = `https://www.fotmob.com/api/matchDetails?matchId=${matchId}`;
      const headers = await getHeaderToken();

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch match details: ${response.status} ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = (await response.json()) as any; // Use type assertion for complex nested data structure

      if (!rawData) {
        throw new Error("No match data received from API");
      }

      // Transform the response to match our expected structure
      const transformedData: MatchDetailData = {
        id: rawData.general?.matchId || rawData.matchId || parseInt(matchId),
        home: {
          id: rawData.general?.homeTeam?.id || rawData.home?.id || 0,
          name: rawData.general?.homeTeam?.name || rawData.home?.name || "Home Team",
          shortName: rawData.general?.homeTeam?.shortName || rawData.home?.shortName || rawData.home?.name || "HOME",
          score: rawData.header?.teams?.[0]?.score || rawData.home?.score || 0,
          formation: rawData.general?.homeTeam?.formation,
        },
        away: {
          id: rawData.general?.awayTeam?.id || rawData.away?.id || 0,
          name: rawData.general?.awayTeam?.name || rawData.away?.name || "Away Team",
          shortName: rawData.general?.awayTeam?.shortName || rawData.away?.shortName || rawData.away?.name || "AWAY",
          score: rawData.header?.teams?.[1]?.score || rawData.away?.score || 0,
          formation: rawData.general?.awayTeam?.formation,
        },
        status: {
          utcTime: rawData.general?.matchTimeUTC || rawData.status?.utcTime || new Date().toISOString(),
          started: rawData.header?.status?.started || false,
          cancelled: rawData.header?.status?.cancelled || false,
          finished: rawData.header?.status?.finished || false,
          ongoing: rawData.header?.status?.ongoing || null,
          postponed: rawData.header?.status?.postponed || false,
          abandoned: rawData.header?.status?.abandoned || false,
          liveTime: rawData.header?.status?.liveTime || null,
          reason: rawData.header?.status?.reason || null,
        },
        tournament: {
          id: rawData.general?.leagueId || 0,
          name: rawData.general?.leagueName || rawData.tournament?.name || "Tournament",
          leagueId: rawData.general?.leagueId || 0,
          round: rawData.general?.leagueRoundName,
          season: rawData.general?.season,
        },
        venue: rawData.general?.venue
          ? {
              id: rawData.general.venue.id || 0,
              name: rawData.general.venue.name,
              city: rawData.general.venue.city || "",
              country: rawData.general.venue.country || "",
              capacity: rawData.general.venue.capacity,
            }
          : undefined,
        referee: rawData.general?.referee
          ? {
              id: rawData.general.referee.id || 0,
              name: rawData.general.referee.name,
              country: rawData.general.referee.country,
            }
          : undefined,
        events: Array.isArray(rawData.content?.matchFacts?.events) ? rawData.content.matchFacts.events : [],
        stats: rawData.content?.stats?.Periods?.All || undefined,
        attendance: rawData.general?.attendance,
      };

      return transformedData;
    },
    [matchId],
    {
      initialData: undefined,
    },
  );

  return { data, error, isLoading };
}
