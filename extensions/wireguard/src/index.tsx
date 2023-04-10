import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import getVPN from "./getVPN";
import toggle from "./toggle";

import { sortVPNList } from "./utils";

export default function Command() {
  // const [VPN, setVPN] = useState<VPN[]>();
  const { isLoading, data } = usePromise(getVPN);

  sortVPNList(data);

  return data?.length === 0 ? (
    <List>
      <List.EmptyView
        title="Something is wrong!"
        description="Wireguard is not installed or no wireguard list found."
        icon="☹️"
      />
    </List>
  ) : (
    <List isLoading={isLoading}>
      {data?.map((item, index) => (
        <List.Item
          icon={item.isConnected ? { source: "connect.png" } : { source: "disconnect.png" }}
          key={index}
          title={item.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title={item.isConnected ? "Disconnect" : "Connect"} onAction={() => toggle(item.name)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
