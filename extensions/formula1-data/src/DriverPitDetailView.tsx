import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { CombinedDriverData, OpenF1PitStop, OpenF1Session, OpenF1Meeting } from "./current-session";
// import { getCountryFlag } from "./utils";
import { useMemo } from "react";

interface DriverPitDetailViewProps {
  driver: CombinedDriverData;
  pitStops: OpenF1PitStop[];
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
}

export default function DriverPitDetailView({ driver, pitStops, sessionInfo, meetingInfo }: DriverPitDetailViewProps) {
  const navTitle = `${driver.name_acronym} - Pit Stops${meetingInfo ? ` @ ${meetingInfo.circuit_short_name}` : ""}`;
  const sortedPitStops = useMemo(
    () =>
      [...pitStops].sort((a, b) => {
        if ((a.lap_number || 0) !== (b.lap_number || 0)) {
          return (a.lap_number || 0) - (b.lap_number || 0);
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }),
    [pitStops],
  );

  return (
    <List navigationTitle={navTitle} searchBarPlaceholder="Filter pit stops...">
      <List.Section title={`Pit Stop Details for ${driver.full_name}`} subtitle={sessionInfo?.session_name}>
        {sortedPitStops.length === 0 && (
          <List.EmptyView
            title="No Pit Stops"
            description="No pit stop data available for this driver in this session."
          />
        )}
        {sortedPitStops.map((pit, index) => (
          <List.Item
            key={`pit-${pit.lap_number}-${pit.date}-${index}`}
            icon={Icon.Gear}
            title={`Lap ${pit.lap_number}: ${pit.pit_duration ? pit.pit_duration.toFixed(3) + "s" : "Duration N/A"}`}
            subtitle={`Pit Stop #${index + 1} (Time: ${new Date(pit.date).toLocaleTimeString()})`}
            accessories={
              [
                // Additional pit stop details can be added here if available in OpenF1PitStop interface
              ]
            }
            actions={
              <ActionPanel title={`Pit Stop on Lap ${pit.lap_number} - ${driver.name_acronym}`}>
                <Action.CopyToClipboard
                  title="Copy Pit Duration"
                  content={pit.pit_duration ? pit.pit_duration.toFixed(3) + "s" : "N/A"}
                />
                <Action.CopyToClipboard title="Copy All Pit Info" content={JSON.stringify(pit, null, 2)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
