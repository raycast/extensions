import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getChampionships, getMatches } from "./api";
import Matchday from "./components/matchday";
import { seasons } from "./components/season_dropdown";

export default function Fixture() {
  const [championship, setChampionship] = useState<string>();

  const { data: championships } = usePromise(getChampionships, [seasons[0]], {
    onData: (data) => {
      setChampionship(data[0].id);
    },
  });

  const { data: matches, isLoading } = usePromise(
    async (championship_id, season) => {
      return championship
        ? await getMatches(season, { championship_id })
        : undefined;
    },
    [championship, seasons[0]],
  );

  const matchday = groupBy(matches, (m) =>
    formatDate(m.date_time, "eeee, dd MMM yyyy"),
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Championship"
          value={championship}
          onChange={setChampionship}
        >
          {championships?.map((championship) => {
            return (
              <List.Dropdown.Item
                key={championship.id}
                value={championship.id}
                title={championship.value}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {Object.entries(matchday).map(([date, fixtures]) => {
        return <Matchday date={date} fixtures={fixtures} key={date} />;
      })}
    </List>
  );
}
