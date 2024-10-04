import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import { COMPETITIONS } from "./constants/competitions";
import ErrorDetail from "./componenets/error";
import { List } from "@raycast/api";
import StandingList from "./componenets/standingList";
import { useState } from "react";
import { LeagueStandingsResponse } from "./types/league-standings";

export default function TODAY_MATCHES() {
  const [competition, setCompetition] = useState<string>("WC");

  const { isLoading, data, error } = useFetch(ENDPOINTS.LEAGUE_STANDINGS.replace("LEAGUE", competition), {
    headers: HEADERS,
    mapResult(result: LeagueStandingsResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  return error ? (
    <ErrorDetail error={error} />
  ) : (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip={"Choose a competition"} onChange={setCompetition}>
          {COMPETITIONS.map(
            (competition) =>
              competition.title !== "All" && (
                <List.Dropdown.Item
                  key={competition.value}
                  title={competition.title}
                  value={competition.value}
                  icon={competition.icon}
                />
              ),
          )}
        </List.Dropdown>
      }
    >
      {!isLoading &&
        data.standings.map((standing) => (
          <StandingList standing={standing} key={`${standing.group} - ${standing.table[0].team.shortName}`} />
        ))}
    </List>
  );
}
