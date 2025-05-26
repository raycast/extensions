import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { OpenF1PitStop, OpenF1Session, CombinedDriverData } from "./current-session";

interface PitStopsDetailViewProps {
  allPitStops: OpenF1PitStop[];
  sessionInfo: OpenF1Session | null;
  drivers: Pick<CombinedDriverData, "driver_number" | "name_acronym" | "full_name" | "team_name" | "team_colour">[];
}

export default function PitStopsDetailView({ allPitStops, sessionInfo, drivers }: PitStopsDetailViewProps) {
  const title = sessionInfo ? `Pit Stops: ${sessionInfo.session_name}` : "Pit Stop Log";

  if (!allPitStops || allPitStops.length === 0) {
    return (
      <List navigationTitle={title}>
        <List.EmptyView title="No Pit Stop Data Available" icon={Icon.Gear} />
      </List>
    );
  }

  // Data can be sorted here if needed, e.g., by lap number or time of pit stop
  // Assuming data from OpenF1 might not be perfectly ordered by occurrence, let's sort by date (desc) or lap_number (asc)
  const sortedPitStops = [...allPitStops].sort((a, b) => {
    // Prefer sorting by lap number, then by date as fallback / tie-breaker
    if (a.lap_number !== b.lap_number) return a.lap_number - b.lap_number;
    return new Date(b.date).getTime() - new Date(a.date).getTime(); // Newest date first if laps are same
  });

  const getDriverInfo = (driverNumber: number) => {
    return drivers.find((d) => d.driver_number === driverNumber);
  };

  return (
    <List navigationTitle={title} isLoading={sortedPitStops.length === 0}>
      <List.Section title={`All Pit Stops (Total: ${sortedPitStops.length}) - Ordered by Lap/Time`}>
        {sortedPitStops.map((pit, index) => {
          const driver = getDriverInfo(pit.driver_number);
          const driverName = driver ? driver.full_name : `Car #${pit.driver_number}`;
          const teamName = driver ? driver.team_name : "N/A";
          const teamColor = driver?.team_colour ? `#${driver.team_colour}` : Color.SecondaryText;

          return (
            <List.Item
              key={`${pit.date}-${pit.driver_number}-${index}`}
              title={`${driverName}`}
              subtitle={teamName}
              icon={{ source: Icon.Gear, tintColor: teamColor }}
              accessories={[
                { tag: `Lap: ${pit.lap_number}` },
                { tag: `Duration: ${pit.pit_duration ? pit.pit_duration.toFixed(2) + "s" : "N/A"}` },
                { tag: `Time: ${new Date(pit.date).toLocaleTimeString()}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Pit Stop Details"
                    content={`Driver: ${driverName}, Lap: ${pit.lap_number}, Duration: ${pit.pit_duration || "N/A"}s, Time: ${new Date(pit.date).toLocaleString()}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
