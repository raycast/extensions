import { Detail, List, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Stats {
  displayValue: string;
}

interface Logo {
  href: string;
}

interface Link {
  href: string;
}

interface Team {
  displayName: string;
  logos: Logo[];
  links: Link[];
}

interface StandingsEntry {
  team: Team;
  stats: Stats[];
}

interface Standings {
  entries: StandingsEntry[];
}

interface StandingsData {
  children: [
    {
      name: string;
      standings: Standings;
    },
    {
      name: string;
      standings: Standings;
    },
  ];
}

export default function scoresAndSchedule() {
  const { isLoading: nflStandingsStats, data: nflStandingsData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings",
  );

  if (nflStandingsStats) {
    return <Detail isLoading={true} />;
  }

  const items1 = nflStandingsData?.children[0].standings.entries;
  const items2 = nflStandingsData?.children[1].standings.entries;

  const americanFootballConference = items1?.map((team1, index) => {
    return (
      <List.Item
        key={index}
        title={`${team1.team.displayName}`}
        accessoryTitle={`${team1.stats[16].displayValue} | Pct: ${(Number(team1.stats[10].displayValue) * 100).toFixed(1)}% | PF: ${team1.stats[7].displayValue} | PA: ${team1.stats[6].displayValue} | Dif: ${team1.stats[5].displayValue}`}
        icon={{ source: team1.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team1.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const nationalFootballConference = items2?.map((team2, index) => {
    return (
      <List.Item
        key={index}
        title={`${team2.team.displayName}`}
        accessoryTitle={`${team2.stats[16].displayValue} | Pct: ${(Number(team2.stats[10].displayValue) * 100).toFixed(1)}% | PF: ${team2.stats[7].displayValue} | PA: ${team2.stats[6].displayValue} | Dif: ${team2.stats[5].displayValue}`}
        icon={{ source: team2.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team2.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List searchBarPlaceholder="Search for your favorite team" isLoading={nflStandingsStats}>
      <List.Section title={`${nflStandingsData?.children[0]?.name}`}>{americanFootballConference}</List.Section>
      <List.Section title={`${nflStandingsData?.children[1]?.name}`}>{nationalFootballConference}</List.Section>
    </List>
  );
}
