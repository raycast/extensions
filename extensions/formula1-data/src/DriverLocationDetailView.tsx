import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { CombinedDriverData, OpenF1LocationDataPoint, OpenF1Session, OpenF1Meeting } from "./current-session";

interface DriverLocationDetailViewProps {
  driver: CombinedDriverData;
  locationData: OpenF1LocationDataPoint[];
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
}

export default function DriverLocationDetailView({
  driver,
  locationData,
  sessionInfo,
  meetingInfo,
}: DriverLocationDetailViewProps) {
  const navTitle = `${driver.name_acronym} - Location Data${meetingInfo ? ` @ ${meetingInfo.circuit_short_name}` : ""}`;
  // Location data is already sorted newest first from DriverDetailView
  // For this view, let's sort it oldest first to see progression.
  const sortedLocationData = [...locationData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <List navigationTitle={navTitle} searchBarPlaceholder="Filter location points...">
      <List.Section title={`Location Data for ${driver.full_name}`} subtitle={sessionInfo?.session_name}>
        {sortedLocationData.length === 0 && (
          <List.EmptyView
            title="No Location Data"
            description="No location data available for this driver in this session."
          />
        )}
        {sortedLocationData.map((loc, index) => (
          <List.Item
            key={`loc-${loc.date}-${index}`}
            icon={Icon.Pin}
            title={`Time: ${new Date(loc.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}`}
            accessories={[{ text: `X: ${loc.x}` }, { text: `Y: ${loc.y}` }, { text: `Z: ${loc.z}` }]}
            actions={
              <ActionPanel title={`Location @ ${new Date(loc.date).toLocaleTimeString()}`}>
                <Action.CopyToClipboard title="Copy Coordinates" content={`X: ${loc.x}, Y: ${loc.y}, Z: ${loc.z}`} />
                <Action.CopyToClipboard title="Copy All Location Info" content={JSON.stringify(loc, null, 2)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
