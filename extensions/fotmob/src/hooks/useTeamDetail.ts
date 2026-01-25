import { useCachedPromise } from "@raycast/utils";
import type { ExtendedTeamDetailData, MatchFixture, TeamDetailData } from "@/types/team-detail";
import { getHeaderToken } from "@/utils/token";

export function useTeamDetail(teamId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (teamId: string): Promise<TeamDetailData> => {
      const url = `https://www.fotmob.com/api/teams?id=${teamId}`;
      const token = await getHeaderToken();

      const response = await fetch(url, { headers: token });
      if (!response.ok) {
        throw new Error("Failed to fetch team details");
      }
      const teamDetailData = (await response.json()) as TeamDetailData;
      return teamDetailData;
    },
    [teamId],
    {
      initialData: undefined,
    },
  );

  // Calculate extended data with helper functions
  const calculateExtendedData = (rawData: TeamDetailData): ExtendedTeamDetailData => {
    if (!rawData?.fixtures?.allFixtures?.fixtures) {
      return {
        ...rawData,
        calculated: {
          upcomingMatch: null,
          ongoingMatch: null,
          previousMatches: [],
          nextMatches: [],
          currentLeaguePosition: undefined,
          recentFormString: undefined,
          nextMatchCountdown: undefined,
          teamFormResults: undefined,
        },
      };
    }

    const fixtures = rawData.fixtures.allFixtures.fixtures;
    const nextMatch = rawData.fixtures.allFixtures.nextMatch;

    // Find ongoing match - check if next match is currently being played
    const ongoingMatch = nextMatch?.status.ongoing ? nextMatch : null;

    // Split fixtures into past and future based on status
    const previousMatches = fixtures
      .filter((fixture) => fixture.status.finished)
      .sort((a, b) => new Date(b.status.utcTime).getTime() - new Date(a.status.utcTime).getTime())
      .slice(0, 10);

    const nextMatches = fixtures
      .filter((fixture) => !fixture.status.finished && !fixture.status.cancelled)
      .sort((a, b) => new Date(a.status.utcTime).getTime() - new Date(b.status.utcTime).getTime())
      .slice(0, 10);

    // Calculate recent form string from team form data
    const teamFormResults = rawData.overview?.teamForm
      ?.slice(0, 5)
      .map((form) => form.result)
      .join("");

    // Calculate recent form from fixtures if teamForm is not available
    const recentFormString = teamFormResults || calculateRecentFormFromFixtures(previousMatches.slice(0, 5), teamId);

    // Get current league position from table
    const currentLeaguePosition = rawData.overview?.table?.all?.find((team) => team.id.toString() === teamId)?.idx;

    // Calculate countdown to next match
    const nextMatchCountdown = nextMatch ? calculateMatchCountdown(nextMatch.status.utcTime) : undefined;

    return {
      ...rawData,
      calculated: {
        upcomingMatch: nextMatch || null,
        ongoingMatch,
        previousMatches,
        nextMatches,
        currentLeaguePosition,
        recentFormString,
        nextMatchCountdown,
        teamFormResults,
      },
    };
  };

  // Helper function to calculate recent form from fixtures
  const calculateRecentFormFromFixtures = (matches: MatchFixture[], teamId: string): string => {
    if (!matches.length) return "";

    return matches
      .map((match) => {
        // Determine if the team won, drew, or lost
        const isHome = match.home.id.toString() === teamId;
        const teamScore = isHome ? match.home.score : match.away.score;
        const opponentScore = isHome ? match.away.score : match.home.score;

        if (teamScore > opponentScore) return "W";
        if (teamScore < opponentScore) return "L";
        return "D";
      })
      .join("");
  };

  // Helper function to calculate time until next match
  const calculateMatchCountdown = (utcTime: string): string => {
    const matchDate = new Date(utcTime);
    const now = new Date();
    const diffMs = matchDate.getTime() - now.getTime();

    if (diffMs <= 0) return "Match started";

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Return extended data or loading state
  if (isLoading || !data) {
    return {
      data: {
        tabs: [],
        allAvailableSeasons: [],
        details: { id: 0, type: "", name: "" },
        overview: {
          season: "",
          selectedSeason: "",
          table: undefined,
          topPlayers: [],
          venue: {
            id: 0,
            name: "",
            lat: 0,
            long: 0,
            capacity: 0,
            city: "",
            country: { name: "", code: "" },
          },
          coachHistory: [],
          overviewFixtures: [],
          teamForm: [],
          hasOngoingMatch: false,
          previousFixturesUrl: "",
          teamColors: { primary: "", secondary: "", text: "" },
        },
        fixtures: {
          allFixtures: { fixtures: [], nextMatch: null, lastMatch: null },
          primaryTournamentId: 0,
          previousFixturesUrl: "",
          hasOngoingMatch: false,
        },
        stats: {
          teamId: 0,
          primaryLeagueId: 0,
          primarySeasonId: 0,
          players: [],
          tournamentId: 0,
          tournamentSeasons: [],
        },
        transfers: {
          type: "",
          data: { transfers: { transfersIn: [], transfersOut: [] } },
        },
        calculated: {
          upcomingMatch: null,
          ongoingMatch: null,
          previousMatches: [],
          nextMatches: [],
          currentLeaguePosition: undefined,
          recentFormString: undefined,
          nextMatchCountdown: undefined,
          teamFormResults: undefined,
        },
      } as ExtendedTeamDetailData,
      error,
      isLoading,
    };
  }

  if (error) {
    return {
      data: {
        tabs: [],
        allAvailableSeasons: [],
        details: { id: 0, type: "", name: "" },
        overview: {
          season: "",
          selectedSeason: "",
          table: undefined,
          topPlayers: [],
          venue: {
            id: 0,
            name: "",
            lat: 0,
            long: 0,
            capacity: 0,
            city: "",
            country: { name: "", code: "" },
          },
          coachHistory: [],
          overviewFixtures: [],
          teamForm: [],
          hasOngoingMatch: false,
          previousFixturesUrl: "",
          teamColors: { primary: "", secondary: "", text: "" },
        },
        fixtures: {
          allFixtures: { fixtures: [], nextMatch: null, lastMatch: null },
          primaryTournamentId: 0,
          previousFixturesUrl: "",
          hasOngoingMatch: false,
        },
        stats: {
          teamId: 0,
          primaryLeagueId: 0,
          primarySeasonId: 0,
          players: [],
          tournamentId: 0,
          tournamentSeasons: [],
        },
        transfers: {
          type: "",
          data: { transfers: { transfersIn: [], transfersOut: [] } },
        },
        calculated: {
          upcomingMatch: null,
          ongoingMatch: null,
          previousMatches: [],
          nextMatches: [],
          currentLeaguePosition: undefined,
          recentFormString: undefined,
          nextMatchCountdown: undefined,
          teamFormResults: undefined,
        },
      } as ExtendedTeamDetailData,
      error,
      isLoading: false,
    };
  }

  return {
    data: calculateExtendedData(data),
    error,
    isLoading: false,
  };
}
