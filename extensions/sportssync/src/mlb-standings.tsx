import { Detail, List, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function scoresAndSchedule() {
  const { isLoading: mlbStandingsStats, data: mlbStandingsData } = useFetch(
    "https://site.web.api.espn.com/apis/v2/sports/baseball/mlb/standings",
  );

  if (mlbStandingsStats) {
    return <Detail isLoading={true} />;
  }

  const items1 = mlbStandingsData.children[0].standings.entries;
  const items2 = mlbStandingsData.children[1].standings.entries;

  const mlbALTeams = items1.map((team1, index) => {
    return (
      <List.Item
        key={index}
        title={`${team1.team.displayName}`}
        accessoryTitle={`${team1.stats[8].displayValue} GP | ${team1.stats[33].displayValue} | Pct: ${(team1.stats[9].displayValue * 100).toFixed(1)}% | PF ${team1.stats[15].displayValue} | PA ${team1.stats[14].displayValue} | Dif ${team1.stats[12].displayValue}`}
        icon={{ source: team1.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team1.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const mlbNLTeams = items2.map((team2, index) => {
    return (
      <List.Item
        key={index}
        title={`${team2.team.displayName}`}
        accessoryTitle={`${team2.stats[8].displayValue} GP | ${team2.stats[33].displayValue} | Pct: ${(team2.stats[9].displayValue * 100).toFixed(1)}% | PF ${team2.stats[15].displayValue} | PA ${team2.stats[14].displayValue} | Dif ${team2.stats[12].displayValue}`}
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
    <List searchBarPlaceholder="Search for your favorite team">
      <List.Section title={`${mlbStandingsData.children[0].name}`}>{mlbALTeams}</List.Section>
      <List.Section title={`${mlbStandingsData.children[1].name}`}>{mlbNLTeams}</List.Section>
    </List>
  );
}
