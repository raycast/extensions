import { Detail, List, Action, ActionPanel, Icon, Color } from "@raycast/api";
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
  links: [
    {
      href: string;
    },
  ];

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

export default function scoresAndSchedule() {
  const { isLoading: mlbStandingsStats, data: mlbStandingsData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/baseball/mlb/standings",
  );

  if (mlbStandingsStats) {
    return <Detail isLoading={true} />;
  }

  const items1 = mlbStandingsData?.children[0]?.standings?.entries;
  const items2 = mlbStandingsData?.children[1]?.standings?.entries;

  const mlbALTeams = items1?.map((team1, index) => {
    const playoffPosition = Number(team1?.stats[10]?.displayValue ?? "0");

    let tagColor;
    let tagIcon;
    let tagTooltip;

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 6) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 7 && playoffPosition <= 14) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 15) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${team1?.team?.displayName}`}
        accessories={[
          {
            text: `${team1?.stats[7]?.displayValue ?? "O"} GP | ${team1?.stats[32]?.displayValue ?? "0-0"} | Pct: ${(Number(team1?.stats[8]?.displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team1?.stats[14]?.displayValue ?? "0"} | PA: ${team1?.stats[13]?.displayValue ?? "0"} | Dif: ${team1?.stats[11]?.displayValue ?? "0"}`,
          },
          {
            tag: { value: team1?.stats[10]?.displayValue ?? "0", color: tagColor },
            icon: tagIcon,
            tooltip: tagTooltip,
          },
        ]}
        icon={{ source: team1?.team?.logos[0]?.href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Team Details on ESPN"
              url={`${team1?.team?.links[0]?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  const mlbNLTeams = items2?.map((team2, index) => {
    const playoffPosition = Number(team2?.stats[10]?.displayValue ?? "0");

    let tagColor;
    let tagIcon;
    let tagTooltip;

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 6) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 7 && playoffPosition <= 14) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 15) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${team2?.team?.displayName}`}
        accessories={[
          {
            text: `${team2?.stats[7]?.displayValue ?? "0"} GP | ${team2?.stats[32]?.displayValue ?? "0-0"} | Pct: ${(Number(team2?.stats[8]?.displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team2?.stats[14]?.displayValue ?? "0"} | PA: ${team2?.stats[13]?.displayValue ?? "0"} | Dif: ${team2?.stats[11]?.displayValue ?? "0"}`,
          },
          {
            tag: { value: team2?.stats[10]?.displayValue ?? "0", color: tagColor },
            icon: tagIcon,
            tooltip: tagTooltip,
          },
        ]}
        icon={{ source: team2?.team?.logos[0]?.href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Team Details on ESPN"
              url={`${team2?.team?.links[0]?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  const alTeamsSectionName = mlbStandingsData?.children[0]?.name ?? "American League";
  const nlTeamsSectionName = mlbStandingsData?.children[1]?.name ?? "National League";

  return (
    <List searchBarPlaceholder="Search for your favorite team" isLoading={mlbStandingsStats}>
      <List.Section title={`${alTeamsSectionName}`}>{mlbALTeams}</List.Section>
      <List.Section title={`${nlTeamsSectionName}`}>{mlbNLTeams}</List.Section>
    </List>
  );
}
