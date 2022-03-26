import { useState } from "react";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import { useDriverStandings, useSeasons } from "../hooks";
import { getFlag } from "../utils";

function DriverList() {
  const [season, setSeason] = useState<string | null>(null);
  const seasons = useSeasons();
  const [standings, isLoading] = useDriverStandings(season);

  return (
    <List
      isLoading={!season || isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select season" onChange={(newValue) => setSeason(newValue)} storeValue>
          {seasons.map((season) => (
            <List.Dropdown.Item key={season.season} value={`${season.season}`} title={`${season.season}`} />
          ))}
        </List.Dropdown>
      }
    >
      {season && (
        <List.Section title={season}>
          {standings.map((standing) => (
            <List.Item
              key={standing.Driver.driverId}
              icon={{
                source: standing.position + ".png",
                tintColor: Color.PrimaryText,
              }}
              title={`${getFlag(standing.Driver.nationality)} ${standing.Driver.givenName} ${
                standing.Driver.familyName
              }`}
              subtitle={standing.Constructors[standing.Constructors.length - 1]?.name}
              accessoryTitle={standing.points}
              actions={
                <ActionPanel title={`${standing.Driver.givenName} ${standing.Driver.familyName}`}>
                  <Action.OpenInBrowser url={standing.Driver.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default DriverList;
