import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { CombinedDriverData, OpenF1PositionDataPoint, OpenF1Session, OpenF1Meeting } from "./current-session";

interface DriverPositionDetailViewProps {
  driver: CombinedDriverData;
  positionHistory: OpenF1PositionDataPoint[];
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
}

export default function DriverPositionDetailView({
  driver,
  positionHistory,
  sessionInfo,
  meetingInfo,
}: DriverPositionDetailViewProps) {
  const navTitle = `${driver.name_acronym} - Position History${meetingInfo ? ` @ ${meetingInfo.circuit_short_name}` : ""}`;
  // Position history is already sorted newest first from DriverDetailView
  // For this view, let's sort it oldest first to see progression.
  const sortedPositionHistory = [...positionHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <List navigationTitle={navTitle} searchBarPlaceholder="Filter position entries...">
      <List.Section title={`Position History for ${driver.full_name}`} subtitle={sessionInfo?.session_name}>
        {sortedPositionHistory.length === 0 && (
          <List.EmptyView
            title="No Position History"
            description="No position history available for this driver in this session."
          />
        )}
        {sortedPositionHistory.map((pos, index) => (
          <List.Item
            key={`pos-${pos.date}-${index}`}
            icon={Icon.LineChart}
            title={`Position: ${pos.position}`}
            subtitle={`Time: ${new Date(pos.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}`}
            actions={
              <ActionPanel title={`Position ${pos.position} @ ${new Date(pos.date).toLocaleTimeString()}`}>
                <Action.CopyToClipboard title="Copy Position" content={String(pos.position)} />
                <Action.CopyToClipboard title="Copy All Position Info" content={JSON.stringify(pos, null, 2)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
