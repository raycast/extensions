import { Detail, List, Action, ActionPanel, Color, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Stats {
  displayValue: string;
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
  // Fetch NBA Standings

  const [currentLeague, displaySelectLeague] = useState("NBA Games");
  const { isLoading: nbaStandingsStats, data: nbaStandingsData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings",
  );

  const items1 = nbaStandingsData?.children?.[0]?.standings?.entries || [];
  const items2 = nbaStandingsData?.children?.[1]?.standings?.entries || [];

  const nbaEasternTeams = items1.map((team1, index) => {
    const playoffPosition = Number(team1.stats[7].displayValue);

    let tagColor;
    let tagIcon;
    let tagTooltip;

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 8) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 8 && playoffPosition <= 14) {
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
        title={`${team1.team.displayName}`}
        accessories={[
          {
            text: `${team1.stats[15].displayValue ?? "0-0"} | Pct: ${(Number(team1.stats[13].displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team1.stats[11].displayValue ?? "0"} | PA: ${team1.stats[10].displayValue ?? "0"} | Dif: ${team1.stats[8].displayValue ?? "0"}`,
          },
          { tag: { value: team1.stats[7].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
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

  const nbaWesternTeams = items2.map((team2, index) => {
    const playoffPosition = Number(team2.stats[7].displayValue);

    let tagColor;
    let tagIcon;
    let tagTooltip;

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 8) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 8 && playoffPosition <= 14) {
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
        title={`${team2.team.displayName}`}
        accessories={[
          {
            text: `${team2.stats[15].displayValue ?? "0-0"} | Pct: ${(Number(team2.stats[13].displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team2.stats[11].displayValue ?? "0"} | PA: ${team2.stats[10].displayValue ?? "0"} | Dif: ${team2.stats[8].displayValue ?? "0"}`,
          },
          { tag: { value: team2.stats[7].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
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

  // Fetch WNBA Stats

  const { isLoading: wnbaStandingsStats, data: wnbaStandingsData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/basketball/wnba/standings",
  );

  const items3 = wnbaStandingsData?.children?.[0]?.standings?.entries || [];
  const items4 = wnbaStandingsData?.children?.[1]?.standings?.entries || [];

  const wnbaEasternTeams = items3.map((team3, index) => {
    const playoffPosition = Number(team3.stats[8].displayValue);

    let tagColor;
    let tagIcon;
    let tagTooltip;

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 4) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 4 && playoffPosition <= 5) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 6) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${team3.team.displayName}`}
        accessories={[
          {
            text: `${team3.stats[16].displayValue ?? "0-0"} | Pct: ${(Number(team3.stats[13].displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team3.stats[12].displayValue ?? "0"} | PA: ${team3.stats[11].displayValue ?? "0"} | Dif: ${team3.stats[9].displayValue ?? "0"}`,
          },
          { tag: { value: team3.stats[8].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team3.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team3.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const wnbaWesternTeams = items4.map((team4, index) => {
    const playoffPosition = Number(team4.stats[8].displayValue);

    let tagColor;
    let tagIcon;
    let tagTooltip;

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 4) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 4 && playoffPosition <= 5) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 6) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${team4.team.displayName}`}
        accessories={[
          {
            text: `${team4.stats[16].displayValue ?? "0-0"} | Pct: ${(Number(team4.stats[13].displayValue) * 100).toFixed(1) ?? "0"}% | PF: ${team4.stats[12].displayValue ?? "0"} | PA: ${team4.stats[11].displayValue ?? "0"} | Dif: ${team4.stats[9].displayValue ?? "0"}`,
          },
          { tag: { value: team4.stats[8].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team4.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team4.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (nbaStandingsStats || wnbaStandingsStats) {
    return <Detail isLoading={true} />;
  }

  nbaEasternTeams.reverse();
  nbaWesternTeams.reverse();

  const nbaEasternStandingsTitle = nbaStandingsData?.children[0]?.name;
  const nbaWesternStandingsTitle = nbaStandingsData?.children[1]?.name;
  const wnbaEasternStandingsTitle = nbaStandingsData?.children[0]?.name;
  const wnbaWesternStandingsTitle = nbaStandingsData?.children[1]?.name;

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="NBA">
          <List.Dropdown.Item title="NBA" value="NBA" />
          <List.Dropdown.Item title="WNBA" value="WNBA" />
        </List.Dropdown>
      }
      isLoading={nbaStandingsStats}
    >
      {currentLeague === "NBA" && (
        <>
          <List.Section title={`${nbaEasternStandingsTitle}`}>{nbaEasternTeams}</List.Section>
          <List.Section title={`${nbaWesternStandingsTitle}`}>{nbaWesternTeams}</List.Section>
        </>
      )}

      {currentLeague === "WNBA" && (
        <>
          <List.Section title={`${wnbaEasternStandingsTitle}`}>{wnbaEasternTeams}</List.Section>
          <List.Section title={`${wnbaWesternStandingsTitle}`}>{wnbaWesternTeams}</List.Section>
        </>
      )}
    </List>
  );
}
