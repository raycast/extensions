import { Detail, List, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Stats {
  displayValue: string;
  summary?: string;
}

interface Athlete {
  displayName: string;
  flag: { href: string };
}

interface Team {
  displayName: string;
}

interface StandingsEntry {
  athlete?: Athlete;
  team?: Team;
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
  // Fetch Driver Standings

  const [currentLeague, displaySelectStandingsType] = useState("Driver Standings");
  const { isLoading: driverStats, data: driverData } = useFetch<StandingsData>(
    "https://site.api.espn.com/apis/v2/sports/racing/f1/standings",
  );

  const driverItems = driverData?.children?.[0]?.standings?.entries || [];
  const drivers = driverItems?.map((driver, index) => {
    const flagSrc = driver?.athlete?.flag.href ?? `${driver?.athlete?.flag?.href}`;

    const driverPosition = Number(driver.stats[0].displayValue ?? "0");

    let tagColor;
    let tagIcon;

    if (driverPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (driverPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${driver?.athlete?.displayName}`}
        icon={{ source: flagSrc }}
        accessories={[
          {
            text: `${driver?.stats[1]?.displayValue ?? "0"} pts`,
          },
          { tag: { value: driver?.stats[0]?.displayValue ?? "0", color: tagColor }, icon: tagIcon },
        ]}
      />
    );
  });

  // Fetch Constructor Standings

  const { isLoading: constructorStats, data: constructorData } = useFetch<StandingsData>(
    "https://site.api.espn.com/apis/v2/sports/racing/f1/standings",
  );

  const constructorItems = constructorData?.children?.[1]?.standings?.entries || [];
  const constructorTeams = constructorItems?.map((constructor, index) => {
    const constructorPosition = Number(constructor?.stats[0].displayValue ?? "0");

    let tagColor;
    let tagIcon;

    if (constructorPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
    } else if (constructorPosition >= 2) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
    } else {
      tagColor = Color.SecondaryText;
    }

    return (
      <List.Item
        key={index}
        title={`${constructor?.team?.displayName}`}
        accessories={[
          {
            text: `${constructor?.stats[1]?.displayValue ?? "0"} pts`,
          },
          { tag: { value: constructor?.stats[0]?.displayValue ?? "0", color: tagColor }, icon: tagIcon },
        ]}
      />
    );
  });

  if (driverStats || constructorStats) {
    return <Detail isLoading={true} />;
  }

  if (!driverData || !constructorData) {
    return <Detail markdown="No data found." />;
  }

  const driverTitle = driverData?.children[0]?.name;
  const constructorTitle = constructorData?.children[1]?.name;

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectStandingsType} defaultValue="Driver Standings">
          <List.Dropdown.Item title={driverTitle} value="Driver Standings" />
          <List.Dropdown.Item title={constructorTitle} value="Constructor Standings" />
        </List.Dropdown>
      }
      isLoading={driverStats}
    >
      {currentLeague === "Driver Standings" && (
        <>
          <List.Section title="Driver Standings">{drivers}</List.Section>
        </>
      )}

      {currentLeague === "Constructor Standings" && (
        <>
          <List.Section title="Constructor Standings">{constructorTeams}</List.Section>
        </>
      )}
    </List>
  );
}
