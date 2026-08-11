import { useTeamDetail } from "./useTeamDetail";

export function useTeamFixture(teamId: string) {
  const { data, error, isLoading } = useTeamDetail(teamId);

  // Return the data in the same format as before for backward compatibility
  return {
    data: {
      ...data,
      calculated: {
        upcommingMatch: data.calculated.upcomingMatch,
        ongoingMatch: data.calculated.ongoingMatch,
        previousMatches: data.calculated.previousMatches,
        nextMatches: data.calculated.nextMatches,
      },
    },
    error,
    isLoading,
  };
}
