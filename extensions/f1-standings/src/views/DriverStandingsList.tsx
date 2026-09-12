import { useState } from "react";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import { useDriverStandings, useFormula1DriverUrl, useSeasons } from "../hooks";
import { getFlag } from "../utils";
import { DriverStanding } from "../types";

function DriverList() {
  const [selectedStanding, setSelectedStanding] = useState<DriverStanding | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const seasons = useSeasons();
  const [standings, isLoading] = useDriverStandings(season);
  const driverUrl = useFormula1DriverUrl(season, selectedStanding?.Driver || null);

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
        setSelectedStanding(standings.find((standing) => standing.Driver.driverId === selectedId) || null);
      }}
    >
      <EmptyView season={season} />
      {season && (
        <List.Section title={season}>
          {standings.map((standing) => (
            <List.Item
              id={standing.Driver.driverId}
              key={standing.Driver.driverId}
              icon={{
                source: standing.position + ".png",
                tintColor: Color.PrimaryText,
              }}
              title={`${getFlag(standing.Driver.nationality)} ${standing.Driver.givenName} ${
                standing.Driver.familyName
              }`}
              subtitle={standing.Constructors[standing.Constructors.length - 1]?.name}
              actions={
                <ActionPanel title={`${standing.Driver.givenName} ${standing.Driver.familyName}`}>
                  <Action.OpenInBrowser title="View on Wikipedia.org" url={standing.Driver.url} icon="wikipedia.png" />
                  {driverUrl && <Action.OpenInBrowser title="View on Formula1.com" url={driverUrl} icon="🏎️" />}
                </ActionPanel>
              }
              accessories={[{ text: standing.points }]}
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
  return <List.EmptyView icon="empty-view.png" description="No results" />;
}

export default DriverList;
