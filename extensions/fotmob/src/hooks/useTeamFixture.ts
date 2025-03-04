import type { MatchFixture, TeamDetailData } from "@/types/team-detail";
import { useTeamDetail } from "./useTeamDetail";

export type Data = TeamDetailData & {
  calculated: {
    upcommingMatch: MatchFixture | null;
    lastMatches: MatchFixture[];
    nextMatches: MatchFixture[];
  };
};

export function useTeamFixture(teamId: string) {
  const { data, error, isLoading } = useTeamDetail(teamId);

  if (data == null || error != null || isLoading) {
    return {
      data: {
        calculated: {
          upcommingMatch: null,
          ongoingMatch: null,
          previousMatches: [],
          nextMatches: [],
        },
      },
      error,
      isLoading,
    };
  }

  const fixtures = data.fixtures.allFixtures.fixtures;
  const nextMatch = data.fixtures.allFixtures.nextMatch;

  const ongoingMatch: MatchFixture | null = nextMatch?.status.ongoing ? nextMatch : null;

  const nextMatchIndex = fixtures.findIndex((fixture) => fixture.id === nextMatch?.id);

  const previousMatches = fixtures.slice(0, nextMatchIndex);
  const nextMatches = (function () {
    if (ongoingMatch) {
      return fixtures.slice(nextMatchIndex + 1, fixtures.length - 1);
    }
    return fixtures.slice(nextMatchIndex, fixtures.length - 1);
  })();

  return {
    data: {
      ...data,
      calculated: {
        upcommingMatch: nextMatch,
        ongoingMatch: ongoingMatch,
        previousMatches: previousMatches,
        nextMatches: nextMatches,
      },
    },
    error,
    isLoading,
  };
}
