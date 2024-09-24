import { getPreferenceValues, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useMemo, useState } from "react";
import { getFixtures, getSeasons, getTeams } from "./api";
import Matchday from "./components/matchday";
import SearchBarAccessory, { competitions } from "./components/searchbar";
import { convertToLocalTime } from "./utils";

const { filter } = getPreferenceValues();

export default function Fixture() {
  const [comps, setCompetition] = useState<string>(competitions[0].value);
  const [teams, setTeams] = useState<string>("-1");

  const { data: seasons = [] } = usePromise(
    (comp) => getSeasons(comp),
    [comps],
  );

  const compSeasons = useMemo(() => seasons[0]?.id.toString(), [seasons]);

  const { data: clubs } = usePromise(
    async (seasonId) => {
      return seasonId ? await getTeams(seasonId) : [];
    },
    [compSeasons],
  );

  const { isLoading, data, pagination } = usePromise(
    (comps, teams) =>
      async ({ page = 0 }) => {
        const [data, hasMore] = await getFixtures({
          teams,
          page,
          sort: "desc",
          statuses: "C",
          comps,
          compSeasons: seasons[0]?.id.toString(),
        });

        return { data, hasMore };
      },
    [comps, teams],
  );

  const matchday = groupBy(data, (f) =>
    convertToLocalTime(f.kickoff.label, "EEE d MMM yyyy"),
  );

  return (
    <List
      throttle
      isLoading={!clubs || isLoading}
      pagination={pagination}
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
        return <Matchday key={day} matchday={day} matches={matches} />;
      })}
    </List>
  );
}
