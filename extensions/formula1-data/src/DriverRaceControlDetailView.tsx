import { List, ActionPanel, Action } from "@raycast/api";
import {
  CombinedDriverData,
  OpenF1RaceControlMessage,
  OpenF1Session,
  OpenF1Meeting,
  getRaceControlIcon, // Import the utility function
} from "./current-session";

interface DriverRaceControlDetailViewProps {
  driver: CombinedDriverData;
  messages: OpenF1RaceControlMessage[];
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
}

export default function DriverRaceControlDetailView({
  driver,
  messages,
  sessionInfo,
  meetingInfo,
}: DriverRaceControlDetailViewProps) {
  const navTitle = `${driver.name_acronym} - Race Control${meetingInfo ? ` @ ${meetingInfo.circuit_short_name}` : ""}`;
  // Messages are already sorted newest first from DriverDetailView.
  // For race control, newest first is usually preferred.

  return (
    <List navigationTitle={navTitle} searchBarPlaceholder="Filter messages...">
      <List.Section title={`Race Control Messages for ${driver.full_name}`} subtitle={sessionInfo?.session_name}>
        {messages.length === 0 && (
          <List.EmptyView
            title="No Messages"
            description={`No race control messages specifically for ${driver.full_name} in this session.`}
          />
        )}
        {messages.map((msg, index) => (
          <List.Item
            key={`rc-${msg.date}-${index}`}
            icon={getRaceControlIcon(msg.category, msg.flag)}
            title={msg.message}
            subtitle={`Category: ${msg.category}${msg.flag ? ` - Flag: ${msg.flag}` : ""} (${new Date(msg.date).toLocaleTimeString()})`}
            accessories={[...(msg.lap_number ? [{ text: `Lap: ${msg.lap_number}` }] : [])]}
            actions={
              <ActionPanel title={`RC Message @ ${new Date(msg.date).toLocaleTimeString()}`}>
                <Action.CopyToClipboard title="Copy Message" content={msg.message} />
                <Action.CopyToClipboard title="Copy All Message Info" content={JSON.stringify(msg, null, 2)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
