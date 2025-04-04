import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { seasons } from "./components/season_dropdown";
import { Match } from "./types";
import { getChampionships, getMatches } from "./api";
import groupBy from "lodash.groupby";
import { Championship } from "./types/coppa";
import Matchday from "./components/matchday";

export default function Fixture() {
  const [matches, setMatches] = useState<Match[]>();

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [championship, setChampionship] = useState<string>();

  useEffect(() => {
    getChampionships(seasons[0]).then((data) => {
      setChampionships(data);
      setChampionship(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (championship) {
      showToast({
        title: "Loading...",
        style: Toast.Style.Animated,
      });
      getMatches(seasons[0], { championship_id: championship }).then((data) => {
        setMatches(data);
        showToast({
          title: "Completed",
          style: Toast.Style.Success,
        });
      });
    }
  }, [championship]);

  const matchday = groupBy(matches, (m) =>
    format(new Date(m.date_time), "eeee, dd MMM yyyy"),
  );

  return (
    <List
      throttle
      isLoading={!matches}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Championship"
          value={championship}
          onChange={setChampionship}
        >
          {championships.map((championship) => {
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
