import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { OpenF1TeamRadio, OpenF1Session, OpenF1Driver } from "./current-session";

interface TeamRadioDetailViewProps {
  radioMessages: OpenF1TeamRadio[];
  sessionInfo: OpenF1Session | null;
  drivers: Pick<OpenF1Driver, "driver_number" | "name_acronym" | "full_name" | "team_name" | "team_colour">[]; // Pass only necessary driver fields
}

export default function TeamRadioDetailView({ radioMessages, sessionInfo, drivers }: TeamRadioDetailViewProps) {
  const title = sessionInfo ? `Team Radio: ${sessionInfo.session_name}` : "Team Radio Log";

  if (!radioMessages || radioMessages.length === 0) {
    return (
      <List navigationTitle={title}>
        <List.EmptyView title="No Team Radio Available" icon={Icon.SpeakerOn} />
      </List>
    );
  }

  // Radio messages are already sorted newest first from current-session.tsx
  const getDriverInfo = (driverNumber: number) => {
    return drivers.find((d) => d.driver_number === driverNumber);
  };

  return (
    <List navigationTitle={title} isLoading={radioMessages.length === 0}>
      <List.Section title={`Radio Messages (Latest First - Total: ${radioMessages.length})`}>
        {radioMessages.map((radio, index) => {
          const driver = getDriverInfo(radio.driver_number);
          const driverName = driver ? driver.full_name : `Car #${radio.driver_number}`;
          const teamName = driver ? driver.team_name : "Unknown Team";
          const teamColor = driver?.team_colour ? `#${driver.team_colour}` : Color.SecondaryText;

          return (
            <List.Item
              key={`${radio.date}-${radio.driver_number}-${index}`}
              title={`🔊 ${driverName}`}
              subtitle={`${new Date(radio.date).toLocaleTimeString()} - ${teamName}`}
              icon={{ source: Icon.SpeakerOn, tintColor: teamColor }}
              accessories={[{ tag: "Listen" }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Play Radio Message" url={radio.recording_url} />
                  <Action.CopyToClipboard title="Copy Recording URL" content={radio.recording_url} />
                  <Action.CopyToClipboard
                    title="Copy Details"
                    content={`${new Date(radio.date).toLocaleTimeString()} - ${driverName} (${teamName}): ${radio.recording_url}`}
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
