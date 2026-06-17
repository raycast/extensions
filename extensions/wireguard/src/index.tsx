import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import getVPN from "./getVPN";
import toggle from "./toggle";

import { sortVPNArray } from "./utils";

export default function Command() {
  const { isLoading, data } = usePromise(getVPN);

  const { showFlag } = getPreferenceValues<Preferences>();

  sortVPNArray(data);

  return data?.length === 0 ? (
    <List>
      <List.EmptyView
        title="Something is wrong!"
        description="Wireguard is not installed or no Wireguard list found."
        icon="☹️"
      />
    </List>
  ) : (
    <List isLoading={isLoading}>
      {data?.map((VPN, index) => (
        <List.Item
          icon={VPN.isConnected ? "connect.png" : "disconnect.png"}
          key={index}
          title={showFlag ? VPN.flag + " " + VPN.name : VPN.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  icon={{ source: Icon.Plug, tintColor: VPN.isConnected ? Color.Red : Color.Green }}
                  title={VPN.isConnected ? "Disconnect" : "Connect"}
                  onAction={() => toggle(VPN)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
