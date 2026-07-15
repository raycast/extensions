import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getMatchday, getMatches } from "./api";
import MatchdayView from "./components/matchday";
import SeasonDropdown, { seasons } from "./components/season_dropdown";
import { Matchday } from "./types";

export default function Fixture() {
  const [season, setSeason] = useState<string>(seasons[0]);
  const [matchday, setMatchday] = useState<Matchday>();

  const { data: matchdays } = usePromise(getMatchday, [season], {
    onData: (data) => {
      const currentDay = data.find(
        (d) =>
          d.category_status === "LIVE" || d.category_status === "TO BE PLAYED",
      );
      if (currentDay) {
        setMatchday(currentDay);
      } else {
        setMatchday(data[data.length - 1]);
      }
    },
  });

  const { data: matches, isLoading } = usePromise(
    async (matchday) => {
      return matchday
        ? getMatches(season, { match_day_id: matchday.id_category })
        : undefined;
    },
    [matchday],
  );

  const categories = groupBy(matches, (m) =>
    formatDate(m.date_time, "dd MMM yyyy"),
  );

  const actionPanel = (
    <ActionPanel.Section title="Matchday">
      {matchdays && matchday && Number(matchday.description) > 1 && (
        <Action
          title={matchdays[Number(matchday.description) - 2].title}
          icon={Icon.ArrowLeftCircle}
          onAction={() => {
            setMatchday(matchdays[Number(matchday.description) - 2]);
          }}
        />
      )}
      {matchdays && matchday && Number(matchday.description) < 38 && (
        <Action
          title={matchdays[Number(matchday.description)].title}
          icon={Icon.ArrowRightCircle}
          onAction={() => {
            setMatchday(matchdays[Number(matchday.description)]);
          }}
        />
      )}
    </ActionPanel.Section>
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      navigationTitle={
        matchday
          ? `${matchday.title} | Fixtures & Results`
          : "Fixtures & Results"
      }
      searchBarAccessory={
        <SeasonDropdown selected={season} onSelect={setSeason} />
      }
    >
      {Object.entries(categories).map(([date, fixtures]) => {
        return (
          <MatchdayView
            date={date}
            fixtures={fixtures}
            key={date}
            actionPanel={actionPanel}
          />
        );
      })}
    </List>
  );
}
