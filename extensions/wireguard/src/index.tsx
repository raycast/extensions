import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import getVPN from "./getVPN";
import toggle from "./toggle";

import { sortVPNArray } from "./utils";

export default function Command() {
  // const [VPN, setVPN] = useState<VPN[]>();
  const { isLoading, data } = usePromise(getVPN);

  const { showFlag } = getPreferenceValues();

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
          icon={
            VPN.isConnected
              ? { source: Icon.Bolt, tintColor: { light: "#333", dark: "#DDD" } }
              : { source: Icon.BoltDisabled, tintColor: { light: "#888", dark: "#999" } }
          }
          key={index}
          title={showFlag ? VPN.flag + " " + VPN.name : VPN.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title={VPN.isConnected ? "Disconnect" : "Connect"} onAction={() => toggle(VPN)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
