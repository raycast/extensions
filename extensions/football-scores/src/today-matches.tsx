import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import { COMPETITIONS } from "./constants/competitions";
import ErrorDetail from "./componenets/error";
import { MatchesResponse } from "./types/today-matches";
import { List } from "@raycast/api";
import MatchList from "./componenets/matchList";
import { useState } from "react";

export default function TODAY_MATCHES() {
  const [competition, setCompetition] = useState<string | null>(null);
  const { isLoading, data, error } = useFetch(`${ENDPOINTS.TODAY_MATCHES}?competitions=${competition}`, {
    headers: HEADERS,
    mapResult(result: MatchesResponse) {
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
          {COMPETITIONS.map((competition) => (
            <List.Dropdown.Item
              key={competition.value}
              title={competition.title}
              value={competition.value}
              icon={competition.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && data.matches.map((match) => <MatchList match={match} key={match.id} />)}
    </List>
  );
}
