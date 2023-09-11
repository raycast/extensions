import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import groupBy from "lodash.groupby";
import CompetitionDropdown from "./components/competition_dropdown";
import { Match } from "./types";
import { getCurrentGameWeek, getMatches } from "./api";
import Matchday from "./components/matchday";

export default function Fixture() {
  const [fixtures, setFixtures] = useState<Match[]>();
  const [competition, setCompetition] = useState<string>("");
  const [matchday, setMatchday] = useState<number>(0);

  useEffect(() => {
    if (competition) {
      setMatchday(0);
      setFixtures(undefined);

      getCurrentGameWeek(competition).then((gameweek) => {
        setMatchday(gameweek.week);
      });
    }
  }, [competition]);

  useEffect(() => {
    if (matchday) {
      showToast({
        title: "Loading...",
        style: Toast.Style.Animated,
      });
      getMatches(competition, matchday).then((data) => {
        setFixtures(data);
        showToast({
          title: "Completed",
          style: Toast.Style.Success,
        });
      });
    }
  }, [matchday]);

  const days = groupBy(fixtures, (m) => {
    return format(new Date(m.date), "eee dd.MM.yyyy");
  });

  const action = (
    <ActionPanel.Section title="Matchday">
      {matchday > 1 && (
        <Action
          title={`Matchday ${matchday - 1}`}
          icon={Icon.ArrowLeftCircle}
          onAction={() => {
            setMatchday(matchday - 1);
          }}
        />
      )}
      {matchday < 38 && (
        <Action
          title={`Matchday ${matchday + 1}`}
          icon={Icon.ArrowRightCircle}
          onAction={() => {
            setMatchday(matchday + 1);
          }}
        />
      )}
    </ActionPanel.Section>
  );

  return (
    <List
      throttle
      isLoading={!fixtures}
      navigationTitle={fixtures ? `Matchday ${matchday} | Fixtures & Results` : "Fixtures & Results"}
      searchBarAccessory={<CompetitionDropdown selected={competition} onSelect={setCompetition} />}
    >
      {Object.entries(days).map(([day, matches]) => {
        return <Matchday key={day} name={day} matches={matches} format="HH:mm" action={action} />;
      })}
    </List>
  );
}
