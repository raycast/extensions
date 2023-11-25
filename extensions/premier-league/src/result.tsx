import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import groupBy from "lodash.groupby";
import { useFixtures, useSeasons, useTeams } from "./hooks";
import { convertToLocalTime } from "./utils";
import SearchBarAccessory, { competitions } from "./components/searchbar";
import Matchday from "./components/matchday";

const { filter } = getPreferenceValues();

export default function Fixture() {
  const [comps, setCompetition] = useState<string>(competitions[0].value);

  const seasons = useSeasons(comps);
  const clubs = useTeams(seasons[0]?.id.toString());

  const [page, setPage] = useState<number>(0);
  const [teams, setTeams] = useState<string>("-1");

  const { fixtures, lastPage } = useFixtures({
    teams,
    page,
    sort: "desc",
    statuses: "C",
    comps,
    compSeasons: seasons[0]?.id.toString(),
  });

  const matchday = groupBy(fixtures, (f) =>
    convertToLocalTime(f.kickoff.label, "EEE d MMM yyyy")
  );

  return (
    <List
      throttle
      isLoading={!clubs || !fixtures}
      searchBarAccessory={
        filter === "competition" ? (
          <SearchBarAccessory
            type={filter}
            selected={comps}
            onSelect={setCompetition}
          />
        ) : (
          <SearchBarAccessory
            type={filter}
            selected={teams}
            onSelect={setTeams}
            clubs={clubs}
          />
        )
      }
    >
      {Object.entries(matchday).map(([day, matches]) => {
        return (
          <Matchday
            key={day}
            matchday={day}
            matches={matches}
            page={page}
            lastPage={lastPage}
            onChangePage={setPage}
          />
        );
      })}
    </List>
  );
}
