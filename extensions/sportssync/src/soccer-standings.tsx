import { Detail, List, Action, ActionPanel } from "@raycast/api";
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
    return (
      <List.Item
        key={index}
        title={`${epl.team.displayName}`}
        icon={{ source: epl.team.logos[0].href }}
        accessoryTitle={`${epl.stats[0].displayValue} GP | ${epl.stats[12].displayValue} | ${epl.stats[3].displayValue} pts | ${epl.stats[5].displayValue} GF | ${epl.stats[4].displayValue} GA | Dif: ${epl.stats[2].displayValue}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${epl.team.links[0].href}`} />
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
    return (
      <List.Item
        key={index}
        title={`${sll.team.displayName}`}
        icon={{ source: sll.team.logos[0].href }}
        accessoryTitle={`${sll.stats[0].displayValue} GP | ${sll.stats[12].displayValue} | ${sll.stats[3].displayValue} pts | ${sll.stats[5].displayValue} GF | ${sll.stats[4].displayValue} GA | Dif: ${sll.stats[2].displayValue}`}
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
    return (
      <List.Item
        key={index}
        title={`${ger.team.displayName}`}
        icon={{ source: ger.team.logos[0].href }}
        accessoryTitle={`${ger.stats[0].displayValue} GP | ${ger.stats[12].displayValue} | ${ger.stats[3].displayValue} pts | ${ger.stats[5].displayValue} GF | ${ger.stats[4].displayValue} GA | Dif: ${ger.stats[2].displayValue}`}
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
    return (
      <List.Item
        key={index}
        title={`${ita.team.displayName}`}
        icon={{ source: ita.team.logos[0].href }}
        accessoryTitle={`${ita.stats[0].displayValue} GP | ${ita.stats[12].displayValue} | ${ita.stats[3].displayValue} pts | ${ita.stats[5].displayValue} GF | ${ita.stats[4].displayValue} GA | Dif: ${ita.stats[2].displayValue}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${ita.team.links[0].href}`} />
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
    return (
      <List.Item
        key={index}
        title={`${uefa.team.displayName}`}
        icon={{ source: uefa.team.logos[0].href }}
        accessoryTitle={`${uefa.stats[0].displayValue} GP | ${uefa.stats[12].displayValue} | ${uefa.stats[3].displayValue} pts | ${uefa.stats[5].displayValue} GF | ${uefa.stats[4].displayValue} GA | Dif: ${uefa.stats[2].displayValue}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Team Details on ESPN" url={`${uefa.team.links[0].href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (eplStats || sllStats || gerStats || itaStats || uefaStats) {
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
