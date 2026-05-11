import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getMatches, getSubscriptionRounds } from "./api";
import Matchday from "./components/matchday";
import { Match, Round } from "./types";

const date = new Date();
const currentYear = date.getFullYear();
const currentMonth = date.getMonth();

const year = currentMonth >= 6 ? currentYear : currentYear - 1;

const competitions = [
  {
    title: "Copa del Rey",
    value: `copa-del-rey-${year}`,
  },
  // {
  //   title: "Copa de la Reina",
  //   value: "copa-de-la-reina",
  // },
  {
    title: "Champions League",
    value: `champions-league-${year}`,
  },
  {
    title: "Eupora League",
    value: `europa-league-${year}`,
  },
  {
    title: "Conference League",
    value: `europa-conference-league-${year}`,
  },
];

export default function OtherCompetitions() {
  const [competition, setCompetition] = useState<string>(competitions[0].value);
  const [round, setRound] = useState<Round>();

  const { data: rounds } = usePromise(
    async (competition) => {
      return competition ? await getSubscriptionRounds(competition) : [];
    },
    [competition],
    {
      onData: (data) => {
        setRound(data[0]);
      },
    },
  );

  const { data: fixtures, isLoading } = usePromise(
    async (round: Round | undefined) => {
      const gameweeks =
        round?.gameweeks.sort((a, b) => a.week - b.week).map((gw) => getMatches(competition, gw.week)) ?? [];
      const data = await Promise.all(gameweeks);

      let matches: Match[] = [];
      data.forEach((d) => {
        matches = matches.concat(d);
      });

      return matches;
    },
    [round],
  );

  const matchday = groupBy(fixtures, "gameweek.name");

  const action = (
    <ActionPanel.Section title="Other Rounds">
      {rounds?.map((round) => {
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
      isLoading={isLoading}
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
