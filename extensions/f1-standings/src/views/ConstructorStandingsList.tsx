import { useState } from "react";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import { useConstructorStandings, useSeasons } from "../hooks";
import { getFlag } from "../utils";

function ConstructorList() {
  const [season, setSeason] = useState<string | null>(null);
  const seasons = useSeasons();
  const [standings, isLoading] = useConstructorStandings(season);

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
              key={standing.Constructor.constructorId}
              icon={{ source: `${standing.position}.png`, tintColor: Color.PrimaryText }}
              title={`${getFlag(standing.Constructor?.nationality)} ${standing.Constructor.name}`}
              actions={
                <ActionPanel title={standing.Constructor.name}>
                  <Action.OpenInBrowser url={standing.Constructor.url} />
                </ActionPanel>
              }
              accessories={[{ text: String(standing.points) }]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default ConstructorList;
