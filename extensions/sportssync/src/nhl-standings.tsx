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

  const atlanticItems = data.children[0]?.children[0]?.standings?.entries;
  const metroItems = data.children[0]?.children[1]?.standings?.entries;

  const centralItems = data.children[1]?.children[0]?.standings?.entries;
  const pacificItems = data.children[1]?.children[1]?.standings?.entries;

  const atlanticTeams = atlanticItems.map((team1, index) => {
    const playoffPosition = Number(team1?.stats[5]?.displayValue ?? "0");

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
        title={`${team1?.team?.displayName}`}
        icon={{ source: team1?.team?.logos[0]?.href }}
        accessories={[
          {
            text: `${team1?.stats[3]?.displayValue ?? "0"} GP | ${team1?.stats[21]?.summary ?? "0-0-0"} | ${team1?.stats[7]?.displayValue ?? "0"} pts | ROW ${team1?.stats[16]?.displayValue ?? "0"} | GF ${team1?.stats[9]?.displayValue ?? "0"} | GA ${team1?.stats[8]?.displayValue ?? "0"} | Dif ${team1?.stats[6]?.displayValue ?? "0"}`,
          },
          { tag: { value: team1?.stats[5]?.displayValue ?? "0", color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
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

  const metroTeams = metroItems.map((team2, index) => {
    const playoffPosition = Number(team2?.stats[5]?.displayValue ?? "0");

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
        title={`${team2?.team?.displayName}`}
        accessories={[
          {
            text: `${team2?.stats[3]?.displayValue ?? "0"} GP | ${team2?.stats[21]?.summary ?? "0-0-0"} | ${team2?.stats[7]?.displayValue ?? "0"} pts | ROW ${team2?.stats[16]?.displayValue ?? "0"} | GF ${team2?.stats[9]?.displayValue ?? "0"} | GA ${team2?.stats[8]?.displayValue ?? "0"} | Dif ${team2?.stats[6]?.displayValue ?? "0"}`,
          },
          { tag: { value: team2?.stats[5]?.displayValue ?? "0", color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
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

  const centralTeams = centralItems.map((team3, index) => {
    const playoffPosition = Number(team3?.stats[5]?.displayValue ?? "0");

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
        title={`${team3?.team?.displayName}`}
        accessories={[
          {
            text: `${team3?.stats[3]?.displayValue ?? "0"} GP | ${team3?.stats[21]?.summary ?? "0-0-0"} | ${team3?.stats[7]?.displayValue ?? "0"} pts | ROW ${team3?.stats[16]?.displayValue ?? "0"} | GF ${team3?.stats[9]?.displayValue ?? "0"} | GA ${team3?.stats[8]?.displayValue ?? "0"} | Dif ${team3?.stats[6]?.displayValue ?? "0"}`,
          },
          { tag: { value: team3?.stats[5]?.displayValue ?? "0", color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team3?.team?.logos[0]?.href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Team Details on ESPN"
              url={`${team3?.team?.links[0]?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  const pacificTeams = pacificItems.map((team4, index) => {
    const playoffPosition = Number(team4?.stats[5]?.displayValue ?? "0");

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
        title={`${team4?.team?.displayName}`}
        accessories={[
          {
            text: `${team4?.stats[3]?.displayValue ?? "0"} GP | ${team4?.stats[21]?.summary ?? "0-0-0"} | ${team4?.stats[7]?.displayValue ?? "0"} pts | ROW ${team4?.stats[16]?.displayValue ?? "0"} | GF ${team4?.stats[9]?.displayValue ?? "0"} | GA ${team4?.stats[8]?.displayValue ?? "0"} | Dif ${team4?.stats[6]?.displayValue ?? "0"}`,
          },
          { tag: { value: team4?.stats[5]?.displayValue ?? "0", color: tagColor }, icon: tagIcon, tooltip: tagTooltip },
        ]}
        icon={{ source: team4?.team?.logos[0]?.href }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Team Details on ESPN"
              url={`${team4?.team?.links[0]?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List searchBarPlaceholder="Search for your favorite team" isLoading={isLoading}>
      <List.Section title={`${data?.children[0]?.children[0]?.name ?? "Atlantic Division"}`}>
        {atlanticTeams}
      </List.Section>
      <List.Section title={`${data?.children[0]?.children[1]?.name ?? "Metropolitan Division"}`}>
        {metroTeams}
      </List.Section>
      <List.Section title={`${data?.children[1]?.children[0]?.name ?? "Central Division"}`}>
        {centralTeams}
      </List.Section>
      <List.Section title={`${data?.children[1]?.children[1]?.name ?? "Pacific Division"}`}>
        {pacificTeams}
      </List.Section>
    </List>
  );
}
