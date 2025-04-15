import { Detail, List, Action, ActionPanel, Color, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Stats {
  displayValue: string;
  summary?: string;
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
  // Fetch EPL Standings

  const [currentLeague, displaySelectLeague] = useState("EPL");
  const { isLoading: eplStats, data: eplData } = useFetch<StandingsData>(
    "http://site.web.api.espn.com/apis/v2/sports/soccer/ENG.1/standings",
  );

  const eplItems = eplData?.children?.[0]?.standings?.entries || [];
  const eplTeams = eplItems.map((epl, index) => {
    const teamPosition = Number(epl.stats[10].displayValue);
    let tagColor;
    let tagIcon;

    if (teamPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (teamPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${epl.team.displayName}`}
        icon={{ source: epl.team.logos[0].href }}
        accessories={[
          {
            text: `${epl.stats[0].displayValue ?? "0"} GP | ${epl.stats[12].displayValue ?? "0-0-0"} | ${epl.stats[3].displayValue ?? "0"} pts | ${epl.stats[5].displayValue ?? "0"} GF | ${epl.stats[4].displayValue ?? "0"} GA | Dif: ${epl.stats[2].displayValue ?? "0"}`,
          },
          { tag: { value: epl.stats[10].displayValue, color: tagColor }, icon: tagIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${epl.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch UEFA Standings

  const { isLoading: uefaStats, data: uefaData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/soccer/uefa.champions/standings",
  );

  const uefaItems = uefaData?.children?.[0]?.standings?.entries || [];

  const uefaTeams = uefaItems.map((uefa, index) => {
    const teamPosition = Number(uefa.stats[10].displayValue);
    let tagColor;
    let tagIcon;

    if (teamPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (teamPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${uefa.team.displayName}`}
        icon={{ source: uefa.team.logos[0].href }}
        accessories={[
          {
            text: `${uefa.stats[0].displayValue ?? "0"} GP | ${uefa.stats[12].displayValue ?? "0-0-0"} | ${uefa.stats[3].displayValue ?? "0"} pts | ${uefa.stats[5].displayValue ?? "0"} GF | ${uefa.stats[4].displayValue ?? "0"} GA | Dif: ${uefa.stats[2].displayValue ?? "0"}`,
          },
          { tag: { value: uefa.stats[10].displayValue, color: tagColor }, icon: tagIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${uefa.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch SLL Standings

  const { isLoading: sllStats, data: sllData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/soccer/ESP.1/standings",
  );

  const sllItems = sllData?.children?.[0]?.standings?.entries || [];
  const sllTeams = sllItems.map((sll, index) => {
    const teamPosition = Number(sll.stats[10].displayValue);
    let tagColor;
    let tagIcon;

    if (teamPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (teamPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${sll.team.displayName}`}
        icon={{ source: sll.team.logos[0].href }}
        accessories={[
          {
            text: `${sll.stats[0].displayValue ?? "0"} GP | ${sll.stats[12].displayValue ?? "0-0-0"} | ${sll.stats[3].displayValue ?? "0"} pts | ${sll.stats[5].displayValue ?? "0"} GF | ${sll.stats[4].displayValue ?? "0"} GA | Dif: ${sll.stats[2].displayValue ?? "0"}`,
          },
          { tag: { value: sll.stats[10].displayValue, color: tagColor }, icon: tagIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${sll.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch GER Standings

  const { isLoading: gerStats, data: gerData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/soccer/GER.1/standings",
  );

  const gerItems = gerData?.children?.[0]?.standings?.entries || [];
  const gerTeams = gerItems.map((ger, index) => {
    const teamPosition = Number(ger.stats[10].displayValue);
    let tagColor;
    let tagIcon;

    if (teamPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (teamPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${ger.team.displayName}`}
        icon={{ source: ger.team.logos[0].href }}
        accessories={[
          {
            text: `${ger.stats[0].displayValue ?? "0"} GP | ${ger.stats[12].displayValue ?? "0-0-0"} | ${ger.stats[3].displayValue ?? "0"} pts | ${ger.stats[5].displayValue ?? "0"} GF | ${ger.stats[4].displayValue ?? "0"} GA | Dif: ${ger.stats[2].displayValue ?? "0"}`,
          },
          { tag: { value: ger.stats[10].displayValue, color: tagColor }, icon: tagIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${ger.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch ITA Standings

  const { isLoading: itaStats, data: itaData } = useFetch<StandingsData>(
    "https://site.web.api.espn.com/apis/v2/sports/soccer/ITA.1/standings",
  );

  const itaItems = itaData?.children?.[0]?.standings?.entries || [];

  const itaTeams = itaItems.map((ita, index) => {
    const teamPosition = Number(ita.stats[10].displayValue);
    let tagColor;
    let tagIcon;

    if (teamPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (teamPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${ita.team.displayName}`}
        icon={{ source: ita.team.logos[0].href }}
        accessories={[
          {
            text: `${ita.stats[0].displayValue ?? "0"} GP | ${ita.stats[12].displayValue ?? "0-0-0"} | ${ita.stats[3].displayValue ?? "0"} pts | ${ita.stats[5].displayValue ?? "0"} GF | ${ita.stats[4].displayValue ?? "0"} GA | Dif: ${ita.stats[2].displayValue ?? "0"}`,
          },
          { tag: { value: ita.stats[10].displayValue, color: tagColor }, icon: tagIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${ita.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (eplStats || uefaStats || sllStats || gerStats || itaStats) {
    return <Detail isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="EPL">
          <List.Dropdown.Item title="EPL" value="EPL" />
          <List.Dropdown.Item title="UEFA" value="UEFA" />
          <List.Dropdown.Item title="SLL" value="SLL" />
          <List.Dropdown.Item title="GER" value="GER" />
          <List.Dropdown.Item title="ITA" value="ITA" />
        </List.Dropdown>
      }
      isLoading={eplStats}
    >
      {currentLeague === "EPL" && (
        <>
          <List.Section title={`${eplData?.children[0]?.name}`}>{eplTeams}</List.Section>
        </>
      )}
      {currentLeague === "UEFA" && (
        <>
          <List.Section title={`${uefaData?.children[0]?.name}`}>{uefaTeams}</List.Section>
        </>
      )}

      {currentLeague === "SLL" && (
        <>
          <List.Section title={`${sllData?.children[0]?.name}`}>{sllTeams}</List.Section>
        </>
      )}
      {currentLeague === "GER" && (
        <>
          <List.Section title={`${gerData?.children[0]?.name}`}>{gerTeams}</List.Section>
        </>
      )}
      {currentLeague === "ITA" && (
        <>
          <List.Section title={`${itaData?.children[0]?.name}`}>{itaTeams}</List.Section>
        </>
      )}
    </List>
  );
}
