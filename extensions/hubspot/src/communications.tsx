import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { lowerCase, startCase } from "lodash";
import { useCommunications } from "@/hooks/useCommunications";

export default function Command() {
  const { isLoading, data } = useCommunications();

  const communications = data?.results;

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No Communications Found" icon="noview.png" />

      {communications?.map((communication) => {
        const hs_communication_channel_type = startCase(
          lowerCase(communication?.properties?.hs_communication_channel_type),
        );
        const hs_communication_logged_from = communication?.properties?.hs_communication_logged_from;
        const createdate = communication?.properties?.hs_lastmodifieddate;

        return (
          <List.Item
            key={communication.id}
            title={hs_communication_channel_type}
            subtitle={`Logged from: ${hs_communication_logged_from}`}
            icon={Icon.Message}
            id={communication.id}
            accessories={[
              {
                date: new Date(createdate),
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
