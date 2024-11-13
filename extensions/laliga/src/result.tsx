import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getCurrentGameWeek, getMatches } from "./api";
import CompetitionDropdown from "./components/competition_dropdown";
import Matchday from "./components/matchday";
import { Gameweek } from "./types";

export default function Fixture() {
  const [competition, setCompetition] = useState<string>("");
  const [matchday, setMatchday] = useState<number>(0);

  usePromise(
    async (competition) => {
      return competition ? await getCurrentGameWeek(competition) : undefined;
    },
    [competition],
    {
      onData: (gameweek: Gameweek | undefined) => {
        setMatchday(gameweek?.week ?? 0);
      },
    },
  );

  const { data: fixtures, isLoading } = usePromise((week) => getMatches(competition, week), [matchday]);

  const days = groupBy(fixtures, (m) => {
    return m.date ? formatDate(m.date, "eee dd.MM.yyyy") : "Postponed";
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
      isLoading={isLoading}
      navigationTitle={!isLoading ? `Matchday ${matchday} | Fixtures & Results` : "Fixtures & Results"}
      searchBarAccessory={<CompetitionDropdown selected={competition} onSelect={setCompetition} />}
    >
      {Object.entries(days).map(([day, matches]) => {
        return <Matchday key={day} name={day} matches={matches} format="HH:mm" action={action} />;
      })}
    </List>
  );
}
