import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import SeasonDropdown, { seasons } from "./components/season_dropdown";
import MatchdayView from "./components/matchday";
import { Match, Matchday } from "./types";
import { getMatchday, getMatches } from "./api";
import groupBy from "lodash.groupby";

export default function Fixture() {
  const [matches, setMatches] = useState<Match[]>();
  const [season, setSeason] = useState<string>(seasons[0]);
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [matchday, setMatchday] = useState<Matchday>();

  useEffect(() => {
    if (season) {
      setMatchdays([]);
      setMatchday(undefined);
      setMatches(undefined);

      getMatchday(season).then((data) => {
        setMatchdays(data);
        const currentDay = data.find(
          (d) =>
            d.category_status === "LIVE" ||
            d.category_status === "TO BE PLAYED",
        );
        if (currentDay) {
          setMatchday(currentDay);
        } else {
          setMatchday(data[data.length - 1]);
        }
      });
    }
  }, [season]);

  useEffect(() => {
    if (matchday) {
      showToast({
        title: "Loading...",
        style: Toast.Style.Animated,
      });
      getMatches(season, { match_day_id: matchday.id_category }).then(
        (data) => {
          setMatches(data);
          showToast({
            title: "Completed",
            style: Toast.Style.Success,
          });
        },
      );
    }
  }, [matchday]);

  const categories = groupBy(matches, (m) =>
    format(new Date(m.date_time), "dd MMM yyyy"),
  );

  const actionPanel = (
    <ActionPanel.Section title="Matchday">
      {matchday && Number(matchday.description) > 1 && (
        <Action
          title={matchdays[Number(matchday.description) - 2].title}
          icon={Icon.ArrowLeftCircle}
          onAction={() => {
            setMatchday(matchdays[Number(matchday.description) - 2]);
          }}
        />
      )}
      {matchday && Number(matchday.description) < 38 && (
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
      isLoading={!matches}
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
