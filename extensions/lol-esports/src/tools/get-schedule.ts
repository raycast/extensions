import type { ScheduleResponse } from "../lib/hooks/use-schedule";

type Input = {
  /** The league ID of the league to get the schedule of */
  leagueId: string;
};

export default async function (input: Input) {
  const url = new URL(`/persisted/gw/getSchedule`, "https://esports-api.lolesports.com");

  url.searchParams.set("hl", "en-US");
  url.searchParams.set("leagueId", input.leagueId);

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      // This is not a private key, it's a public key that is used to access the API.
      "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z",
    },
  });

  const { data } = (await response.json()) as ScheduleResponse;

  return {
    events: data.schedule.events.map((event) => ({
      type: event.type,
      state: event.state,
      startTime: event.startTime,
      blockName: event.blockName,
      match: {
        id: event.match.id,
        strategy: event.match.strategy,
        teams: event.match.teams.map((team) => ({
          name: team.name,
          code: team.code,
          result: team.result,
          record: team.record,
        })),
      },
    })),
  };
}
