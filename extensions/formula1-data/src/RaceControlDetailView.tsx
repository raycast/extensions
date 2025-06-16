import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { OpenF1RaceControlMessage, OpenF1Session } from "./current-session";
import { getRaceControlIcon } from "./current-session"; // Assuming getRaceControlIcon is exported or moved to utils

interface RaceControlDetailViewProps {
  messages: OpenF1RaceControlMessage[];
  sessionInfo: OpenF1Session | null;
  drivers: { driver_number: number; name_acronym: string; full_name: string }[]; // For mapping driver number to name
}

export default function RaceControlDetailView({ messages, sessionInfo, drivers }: RaceControlDetailViewProps) {
  const title = sessionInfo ? `Race Control: ${sessionInfo.session_name}` : "Race Control Log";

  if (!messages || messages.length === 0) {
    return (
      <List navigationTitle={title}>
        <List.EmptyView title="No Race Control Messages Available" icon={Icon.Message} />
      </List>
    );
  }

  // Messages are already sorted newest first from current-session.tsx
  const getDriverAcronym = (driverNumber: number | null | undefined) => {
    if (!driverNumber) return "";
    const driver = drivers.find((d) => d.driver_number === driverNumber);
    return driver ? ` (${driver.name_acronym})` : "";
  };

  return (
    <List navigationTitle={title} isLoading={messages.length === 0}>
      <List.Section title={`Messages (Latest First - Total: ${messages.length})`}>
        {messages.map((msg, index) => (
          <List.Item
            key={`${msg.date}-${index}-${msg.message.slice(0, 10)}`}
            title={msg.message}
            subtitle={`${new Date(msg.date).toLocaleTimeString()} - ${msg.category}${msg.flag ? ` (${msg.flag})` : ""}${msg.lap_number ? ` Lap ${msg.lap_number}` : ""}`}
            icon={getRaceControlIcon(msg.category, msg.flag)}
            accessories={[
              ...(msg.driver_number
                ? [{ tag: `Car #${msg.driver_number}${getDriverAcronym(msg.driver_number)}` }]
                : []),
              ...(msg.scope ? [{ tag: `Scope: ${msg.scope}` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Message" content={msg.message} />
                <Action.CopyToClipboard
                  title="Copy Full Details"
                  content={`${new Date(msg.date).toLocaleString()} - ${msg.category}${msg.flag ? ` (${msg.flag})` : ""}: ${msg.message}${msg.lap_number ? ` (Lap ${msg.lap_number})` : ""}${msg.driver_number ? ` (Car #${msg.driver_number})` : ""}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
