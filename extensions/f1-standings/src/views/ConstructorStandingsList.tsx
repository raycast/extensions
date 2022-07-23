import { useState } from "react";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import { useConstructorStandings, useFormula1ConstructorUrl, useSeasons } from "../hooks";
import { getFlag } from "../utils";
import { ConstructorStanding } from "../types";

function ConstructorList() {
  const [selectedStanding, setSelectedStanding] = useState<ConstructorStanding | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const seasons = useSeasons();
  const [standings, isLoading] = useConstructorStandings(season);
  const constructorUrl = useFormula1ConstructorUrl(season, selectedStanding?.Constructor || null);

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
      onSelectionChange={(selectedId) => {
        if (!selectedId) {
          return;
        }
        setSelectedStanding(standings.find((standing) => standing.Constructor.constructorId === selectedId) || null);
      }}
    >
      <EmptyView season={season} />
      {season && (
        <List.Section title={season}>
          {standings.map((standing) => (
            <List.Item
              id={standing.Constructor.constructorId}
              key={standing.Constructor.constructorId}
              icon={{ source: `${standing.position}.png`, tintColor: Color.PrimaryText }}
              title={`${getFlag(standing.Constructor?.nationality)} ${standing.Constructor.name}`}
              actions={
                <ActionPanel title={standing.Constructor.name}>
                  <Action.OpenInBrowser
                    title="View on Wikipedia.org"
                    url={standing.Constructor.url}
                    icon="wikipedia.png"
                  />
                  {constructorUrl && (
                    <Action.OpenInBrowser title="View on Formula1.com" url={constructorUrl} icon="🏎️" />
                  )}
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

function EmptyView({ season }: { season: string | null }) {
  if (!season) {
    return null;
  }
  if (Number.parseInt(season, 10) < 1958) {
    return (
      <List.EmptyView icon="empty-view.png" description="The Constructors Championship was not awarded until 1958" />
    );
  }
  return <List.EmptyView icon="empty-view.png" description="No results" />;
}

export default ConstructorList;
