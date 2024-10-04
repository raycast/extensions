import { Detail, List } from "@raycast/api";
import { MatchesResponse } from "../types/today-matches";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "../constants/prefrences";
import MatchList from "./matchList";

export default function UpcomingTeamMatches({ teamId }: { teamId: string }) {
  const { isLoading, data, error } = useFetch(ENDPOINTS.UPCOMING_TEAM_MATCHES.replace("TEAMID", teamId), {
    headers: HEADERS,
    mapResult(result: MatchesResponse) {
      return {
        data: result,
      };
    },
    async onData(data) {
      console.log(data);
    },
    initialData: [],
    keepPreviousData: true,
  });

  return error ? (
    <Detail
      markdown={"Unfortunately, your API subscription does not allow you to view upcoming matches for this team"}
    />
  ) : (
    <List isLoading={isLoading}>
      {!isLoading && data.matches.map((match) => <MatchList match={match} key={match.id} />)}
    </List>
  );
}
