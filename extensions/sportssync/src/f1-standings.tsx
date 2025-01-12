import { Detail, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function scoresAndSchedule() {
  // Fetch Driver Standings

  const [currentLeague, displaySelectStandingsType] = useState("Driver Standings");
  const { isLoading: driverStats, data: driverData } = useFetch(
    "https://site.api.espn.com/apis/v2/sports/racing/f1/standings",
  );

  const driverItems = driverData?.children?.[0]?.standings?.entries || [];
  const drivers = driverItems.map((driver, index) => {
    return (
      <List.Item
        key={index}
        title={`${driver.athlete.displayName}`}
        icon={{ source: driver.athlete.flag.href }}
        accessoryTitle={`${driver.stats[1].displayValue} pts `}
      />
    );
  });

  // Fetch Constructor Standings

  const { isLoading: constructorStats, data: constructorData } = useFetch(
    "https://site.api.espn.com/apis/v2/sports/racing/f1/standings",
  );

  const constructorItems = constructorData?.children?.[1]?.standings?.entries || [];
  const constructorTeams = constructorItems.map((constructor, index) => {
    return (
      <List.Item
        key={index}
        title={`${constructor.team.displayName}`}
        accessoryTitle={`${constructor.stats[1].displayValue} pts `}
      />
    );
  });

  if (driverStats || constructorStats) {
    return <Detail isLoading={true} />;
  }

  if (!driverData || !constructorData) {
    return <Detail markdown="No data found." />;
  }

  const driverTitle = driverData.children[0].name;
  const constructorTitle = constructorData.children[1].name;

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectStandingsType} defaultValue="Driver Standings">
          <List.Dropdown.Item title={driverTitle} value="Driver Standings" />
          <List.Dropdown.Item title={constructorTitle} value="Constructor Standings" />
        </List.Dropdown>
      }
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
