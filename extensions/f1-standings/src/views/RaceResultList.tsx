import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useState } from "react";
import { useFormula1DriverUrl, useRaceResult } from "../hooks";
import { RaceResult, RaceResultItem } from "../types";
import { getFlag } from "../utils";

interface RaceResultViewProps {
  season: string;
  round: string;
}

function RaceResultList({ season, round }: RaceResultViewProps) {
  const [selectedDriver, setSelectedDriver] = useState<RaceResultItem | null>(null);
  const [raceResult, isLoading] = useRaceResult(season, round);
  const driverUrl = useFormula1DriverUrl(season, selectedDriver?.Driver || null);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Race Results"
      onSelectionChange={(selectedId) => {
        if (!selectedId) {
          return;
        }
        setSelectedDriver(raceResult?.Results.find((item) => item.Driver.driverId === selectedId) || null);
      }}
    >
      {raceResult && (
        <List.Section title={`${raceResult.raceName} ${new Date(raceResult.date).toLocaleDateString()}`}>
          {raceResult.Results.map((item) => (
            <List.Item
              id={item.Driver.driverId}
              key={item.Driver.driverId}
              icon={{
                source: item.position + ".png",
                tintColor: Color.PrimaryText,
              }}
              title={getFlag(item.Driver.nationality) + " " + item.Driver.givenName + " " + item.Driver.familyName}
              subtitle={item.Constructor.name}
              actions={
                <ActionPanel title={item.Driver.givenName + " " + item.Driver.familyName}>
                  <Action.OpenInBrowser title="View on Wikipedia.org" url={item.Driver.url} icon="wikipedia.png" />
                  {driverUrl && <Action.OpenInBrowser title="View on Formula1.com" url={driverUrl} icon="🏎️" />}
                </ActionPanel>
              }
              accessories={[{ text: String(item.points) }]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default RaceResultList;
