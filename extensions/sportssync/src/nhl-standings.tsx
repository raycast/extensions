import { Detail, List, Action, ActionPanel, Color, Icon } from "@raycast/api";
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
    },
    {
      name: string;
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
    },
  ];
}

export default function command() {
  const { isLoading, data } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings?type=0&level=3&sort=playoffseed:asc,points:desc,gamesplayed:asc",
  );

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!data) {
    return <Detail markdown="No data found." />;
  }

  const atlanticItems = data.children[0].children[0].standings.entries;
  const metroItems = data.children[0].children[1].standings.entries;
  const centralItems = data.children[1].children[0].standings.entries;
  const pacificItems = data.children[1].children[1].standings.entries;

  const atlanticTeams = atlanticItems.map((team1, index) => {
    const playoffPosition = Number(team1.stats[5].displayValue);

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
    } else if (playoffPosition >= 9 && playoffPosition <= 15) {
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
        title={`${team1.team.displayName}`}
        icon={{ source: team1.team.logos[0].href }}
        accessories={[
          {
            text: `${team1.stats[3].displayValue} GP | ${team1.stats[21].summary} | ${team1.stats[7].displayValue} pts | ROW ${team1.stats[16].displayValue} | GF ${team1.stats[9].displayValue} | GA ${team1.stats[8].displayValue} | Dif ${team1.stats[6].displayValue}`,
          },
          { tag: { value: team1.stats[5].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team1.team.links[0].href}`} />
            <Action.OpenInBrowser title="View Standings on ESPN" url={`${data?.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const metroTeams = metroItems.map((team2, index) => {
    const playoffPosition = Number(team2.stats[5].displayValue);

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
    } else if (playoffPosition >= 9 && playoffPosition <= 15) {
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
            text: `${team2.stats[3].displayValue} GP | ${team2.stats[21].summary} | ${team2.stats[7].displayValue} pts | ROW ${team2.stats[16].displayValue} | GF ${team2.stats[9].displayValue} | GA ${team2.stats[8].displayValue} | Dif ${team2.stats[6].displayValue}`,
          },
          { tag: { value: team2.stats[5].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team2.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team2.team.links[0].href}`} />
            <Action.OpenInBrowser title="View Standings on ESPN" url={`${data?.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const centralTeams = centralItems.map((team3, index) => {
    const playoffPosition = Number(team3.stats[5].displayValue);

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
    } else if (playoffPosition >= 9 && playoffPosition <= 15) {
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
        title={`${team3.team.displayName}`}
        accessories={[
          {
            text: `${team3.stats[3].displayValue} GP | ${team3.stats[21].summary} | ${team3.stats[7].displayValue} pts | ROW ${team3.stats[16].displayValue} | GF ${team3.stats[9].displayValue} | GA ${team3.stats[8].displayValue} | Dif ${team3.stats[6].displayValue}`,
          },
          { tag: { value: team3.stats[5].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team3.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team3.team.links[0].href}`} />
            <Action.OpenInBrowser title="View Standings on ESPN" url={`${data?.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  const pacificTeams = pacificItems.map((team4, index) => {
    const playoffPosition = Number(team4.stats[5].displayValue);

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
    } else if (playoffPosition >= 9 && playoffPosition <= 15) {
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
        title={`${team4.team.displayName}`}
        accessories={[
          {
            text: `${team4.stats[3].displayValue} GP | ${team4.stats[21].summary} | ${team4.stats[7].displayValue} pts | ROW ${team4.stats[16].displayValue} | GF ${team4.stats[9].displayValue} | GA ${team4.stats[8].displayValue} | Dif ${team4.stats[6].displayValue}`,
          },
          { tag: { value: team4.stats[5].displayValue, color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team4.team.logos[0].href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${team4.team.links[0].href}`} />
            <Action.OpenInBrowser title="View Standings on ESPN" url={`${data?.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List searchBarPlaceholder="Search for your favorite team" isLoading={isLoading}>
      <List.Section title={`${data.children[0].children[0].name}`}>{atlanticTeams}</List.Section>
      <List.Section title={`${data.children[0].children[1].name}`}>{metroTeams}</List.Section>
      <List.Section title={`${data.children[1].children[0].name}`}>{centralTeams}</List.Section>
      <List.Section title={`${data.children[1].children[1].name}`}>{pacificTeams}</List.Section>
    </List>
  );
}
