import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getCoppaRounds, getMatches } from "./api";
import Matchday from "./components/matchday";
import { seasons } from "./components/season_dropdown";

export default function Fixture() {
  const [roundId, setRoundId] = useState<string>();

  const { data: rounds } = usePromise(getCoppaRounds, [seasons[0]], {
    onData: (rounds) => {
      setRoundId(rounds.reverse()[0].id_category.toString());
    },
  });

  const { data: matches, isLoading } = usePromise(
    async (season, round_id) => {
      return round_id ? await getMatches(season, { round_id }) : undefined;
    },
    [seasons[0], roundId],
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
          tooltip="Filter by Round"
          value={roundId}
          onChange={setRoundId}
        >
          {rounds?.reverse().map((round) => {
            return (
              <List.Dropdown.Item
                key={round.id_category}
                value={round.id_category.toString()}
                title={round.title}
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
