import { Detail, List, Action, ActionPanel, Color, Icon } from "@raycast/api";
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
  links: [
    {
      href: string;
    },
  ];

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

  const americanFootballConference = items1
    ?.map((team1) => {
      const playoffPosition = Number(team1.stats[4].displayValue);
      return { ...team1, playoffPosition };
    })
    .sort((a, b) => a.playoffPosition - b.playoffPosition)
    .map((team1, index) => {
      const playoffPosition = Number(team1.stats[4].displayValue);

      let tagColor;
      let tagIcon;
      let tagTooltip;

      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 7) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 8 && playoffPosition <= 15) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 16) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
        tagIcon = null;
        tagTooltip = "Unknown";
      }

      return (
        <List.Item
          key={index}
          title={`${team1.team.displayName}`}
          accessories={[
            {
              text: `${team1.stats[16].displayValue ?? "0-0"} | Pct: ${(Number(team1.stats[10].displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team1.stats[7].displayValue ?? "0"} | PA: ${team1.stats[6].displayValue ?? "0"} | Dif: ${team1.stats[5].displayValue ?? "0"}`,
            },
            { tag: { value: team1.stats[4].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
          ]}
          icon={{ source: team1.team.logos[0].href }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team1.team.links[0].href}`} />
            </ActionPanel>
          }
        />
      );
    });

  const nationalFootballConference = items2
    ?.map((team2) => {
      const playoffPosition = Number(team2.stats[4].displayValue);
      return { ...team2, playoffPosition };
    })
    .sort((a, b) => a.playoffPosition - b.playoffPosition)
    .map((team2, index) => {
      const playoffPosition = Number(team2.stats[4].displayValue);

      let tagColor;
      let tagIcon;
      let tagTooltip;

      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 7) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 8 && playoffPosition <= 15) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 16) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }

      return (
        <List.Item
          key={index}
          title={`${team2.team.displayName}`}
          accessories={[
            {
              text: `${team2.stats[16].displayValue ?? "0-0"} | Pct: ${(Number(team2.stats[10].displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team2.stats[7].displayValue ?? "0"} | PA: ${team2.stats[6].displayValue ?? "0"} | Dif: ${team2.stats[5].displayValue ?? "0"}`,
            },
            { tag: { value: team2.stats[4].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
          ]}
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
