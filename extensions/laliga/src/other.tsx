import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Match, Round } from "./types";
import { getMatches, getSubscriptionRounds } from "./api";
import groupBy from "lodash.groupby";
import Matchday from "./components/matchday";

const competitions = [
  {
    title: "Copa del Rey",
    value: "copa-del-rey-2022",
  },
  // {
  //   title: "Copa de la Reina",
  //   value: "copa-de-la-reina",
  // },
  {
    title: "Champions League",
    value: "champions-league-2022",
  },
  {
    title: "Eupora League",
    value: "europa-league-2022",
  },
  {
    title: "Conference League",
    value: "europa-conference-league-2022",
  },
];

export default function Fixture() {
  const [fixtures, setFixtures] = useState<Match[]>();
  const [competition, setCompetition] = useState<string>("");
  const [round, setRound] = useState<Round>();
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    if (competition) {
      setRound(undefined);
      setFixtures(undefined);
      setRounds([]);

      getSubscriptionRounds(competition).then((data) => {
        setRounds(data);
        setRound(data[0]);
      });
    }
  }, [competition]);

  useEffect(() => {
    if (round) {
      setFixtures(undefined);
      showToast({
        title: "Loading...",
        style: Toast.Style.Animated,
      });
      const gameweeks = round.gameweeks.sort((a, b) => a.week - b.week).map((gw) => getMatches(competition, gw.week));

      Promise.all(gameweeks).then((data) => {
        let matches: Match[] = [];
        data.forEach((d) => {
          matches = matches.concat(d);
        });

        setFixtures(matches);
        showToast({
          title: "Completed",
          style: Toast.Style.Success,
        });
      });
    }
  }, [round]);

  const matchday = groupBy(fixtures, "gameweek.name");

  const action = (
    <ActionPanel.Section title="Other Rounds">
      {rounds.map((round) => {
        return (
          <Action
            key={round.id}
            icon={Icon.SoccerBall}
            title={round.name}
            onAction={() => {
              setRound(round);
            }}
          />
        );
      })}
    </ActionPanel.Section>
  );

  const selectedCompetition = competitions.find((c) => c.value === competition);

  return (
    <List
      throttle
      isLoading={!fixtures}
      navigationTitle={round ? `${round.name} | ${selectedCompetition?.title}` : "Fixtures & Results"}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Competition" value={competition} onChange={setCompetition}>
          {competitions.map((c) => {
            return <List.Dropdown.Item key={c.value} value={c.value} title={c.title} />;
          })}
        </List.Dropdown>
      }
    >
      {Object.entries(matchday).map(([roundname, matches]) => {
        return <Matchday key={roundname} name={roundname} matches={matches} action={action} />;
      })}
    </List>
  );
}
