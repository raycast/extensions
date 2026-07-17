import { isWithinInterval } from "date-fns";
import { TournamentsByLeagueResponse } from "../lib/hooks/use-tournaments";
import { TournamentStagesResponse } from "../lib/hooks/use-rankings";

type Input = {
  /** The league ID of the league to get the schedule of */
  leagueId: string;
};

export default async function (input: Input) {
  const getTournamentsForLeagueURL = new URL(
    `/persisted/gw/getTournamentsForLeague`,
    "https://esports-api.lolesports.com",
  );
  getTournamentsForLeagueURL.searchParams.set("hl", "en-US");
  getTournamentsForLeagueURL.searchParams.set("leagueId", input.leagueId);

  const response = await fetch(getTournamentsForLeagueURL.toString(), {
    headers: {
      accept: "application/json",
      // This is not a private key, it's a public key that is used to access the API.
      "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z",
    },
  });

  const { data: tournamentsData } = (await response.json()) as TournamentsByLeagueResponse;

  const tournament = tournamentsData.leagues[0].tournaments?.find((t) => {
    const startTime = new Date(t.startDate);
    const endTime = new Date(t.endDate);
    return isWithinInterval(new Date(), { start: startTime, end: endTime });
  });

  if (!tournament) {
    return {
      message: "No tournament found for the given league ID",
    };
  }

  const getStandingsV3URL = new URL(`/persisted/gw/getStandingsV3`, "https://esports-api.lolesports.com");
  getStandingsV3URL.searchParams.set("hl", "en-US");
  getStandingsV3URL.searchParams.set("tournamentId", tournament.id);

  const standingsResponse = await fetch(getStandingsV3URL.toString(), {
    headers: {
      accept: "application/json",
      // This is not a private key, it's a public key that is used to access the API.
      "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z",
    },
  });

  const { data: standingsData } = (await standingsResponse.json()) as TournamentStagesResponse;

  return {
    rankings: standingsData?.standings?.[0].stages[0].sections[0].rankings.flatMap(({ teams, ordinal }) => {
      return teams.map((team) => ({
        position: ordinal,
        team: {
          id: team.id,
          name: team.name,
          code: team.code,
          record: team.record,
        },
      }));
    }),
  };
}
