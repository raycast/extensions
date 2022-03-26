import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useRaceResult } from "../hooks";
import { getFlag } from "../utils";

interface RaceResultViewProps {
  season: string;
  round: string;
}

function RaceResultList({ season, round }: RaceResultViewProps) {
  const [raceResult, isLoading] = useRaceResult(season, round);

  return (
    <List isLoading={isLoading} navigationTitle="Race Results">
      {raceResult && (
        <List.Section title={`${raceResult.raceName} ${new Date(raceResult.date).toLocaleDateString()}`}>
          {raceResult.Results.map((item) => (
            <List.Item
              key={item.Driver.driverId}
              icon={{
                source: item.position + ".png",
                tintColor: Color.PrimaryText,
              }}
              title={getFlag(item.Driver.nationality) + " " + item.Driver.givenName + " " + item.Driver.familyName}
              subtitle={item.Constructor.name}
              actions={
                <ActionPanel title={item.Driver.givenName + " " + item.Driver.familyName}>
                  <Action.OpenInBrowser url={item.Driver.url} />
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
