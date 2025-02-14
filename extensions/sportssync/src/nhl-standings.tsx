import { Detail, List, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Stats {
  displayValue: string;
  summary?: string;
}

interface Team {
  displayName: string;
  logos: { href: string }[];
  links: { href: string }[];
}

interface StandingsEntry {
  team: Team;
  stats: Stats[];
}

interface StandingsData {
  children: [
    {
      name: string;
      standings: {
        entries: StandingsEntry[];
      };
    },
    {
      name: string;
      standings: {
        entries: StandingsEntry[];
      };
    },
  ];
}

export default function command() {
  const { isLoading, data } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings",
  );

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!data) {
    return <Detail markdown="No data found." />;
  }

  const easternItems = data.children[0].standings.entries;
  const westernItems = data.children[1].standings.entries;

  const easternTeams = easternItems.map((team1, index) => {
    return (
      <List.Item
        key={index}
        title={`${team1.team.displayName}`}
        accessoryTitle={`${team1.stats[3].displayValue} GP | ${team1.stats[21].summary} | ${team1.stats[7].displayValue} pts | ROW ${team1.stats[16].displayValue} | GF ${team1.stats[9].displayValue} | GA ${team1.stats[8].displayValue} | Dif ${team1.stats[6].displayValue}`}
        icon={{ source: team1.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team1.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const westernTeams = westernItems.map((team2, index) => {
    return (
      <List.Item
        key={index}
        title={`${team2.team.displayName}`}
        accessoryTitle={`${team2.stats[3].displayValue} GP | ${team2.stats[21].summary} | ${team2.stats[7].displayValue} pts | ROW ${team2.stats[16].displayValue} | GF ${team2.stats[9].displayValue} | GA ${team2.stats[8].displayValue} | Dif ${team2.stats[6].displayValue}`}
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
    <List searchBarPlaceholder="Search for your favorite team" isLoading={isLoading}>
      <List.Section title={`${data.children[0].name}`}>{easternTeams}</List.Section>
      <List.Section title={`${data.children[1].name}`}>{westernTeams}</List.Section>
    </List>
  );
}
