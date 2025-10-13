import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { seasons } from "./components/season_dropdown";
import { Match } from "./types";
import { getCoppaRounds, getMatches } from "./api";
import groupBy from "lodash.groupby";
import { Round } from "./types/coppa";
import Matchday from "./components/matchday";

export default function Fixture() {
  const [matches, setMatches] = useState<Match[]>();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundId, setRoundId] = useState<string>();

  useEffect(() => {
    getCoppaRounds(seasons[0]).then((data) => {
      const reversed = data.reverse();
      setRounds(reversed);
      setRoundId(reversed[0].id_category.toString());
    });
  }, []);

  useEffect(() => {
    if (roundId) {
      showToast({
        title: "Loading...",
        style: Toast.Style.Animated,
      });
      getMatches(seasons[0], { round_id: roundId }).then((data) => {
        setMatches(data);
        showToast({
          title: "Completed",
          style: Toast.Style.Success,
        });
      });
    }
  }, [roundId]);

  const matchday = groupBy(matches, (m) =>
    format(new Date(m.date_time), "eeee, dd MMM yyyy"),
  );

  return (
    <List
      throttle
      isLoading={!matches}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Round"
          value={roundId}
          onChange={setRoundId}
        >
          {rounds.map((round) => {
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
