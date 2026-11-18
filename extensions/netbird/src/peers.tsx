import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getNetbirdStatus } from "./utils";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
};

export default function Command() {
  const { data: status, isLoading, error } = usePromise(getNetbirdStatus);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to fetch peers"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Help" url="https://netbird.io/docs" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (status && !status.management.connected) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="NetBird is not connected"
          description="Your NetBird client is not connected to the management server. Please check your connection and try again."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Help" url="https://netbird.io/docs" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const peers = status?.peers?.details || [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search peers by name or IP...">
      {peers.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No Peers Found"
          description="It looks like you don't have any peers in your network yet."
        />
      ) : (
        <>
          {peers.map((peer) => {
            const isConnected = peer.status.toLowerCase() === "connected";

            return (
              <List.Item
                key={peer.publicKey}
                icon={{
                  source: Icon.CircleFilled,
                  tintColor: isConnected ? Color.Green : Color.SecondaryText,
                }}
                title={peer.fqdn}
                subtitle={peer.netbirdIp}
                accessories={[
                  {
                    text: isConnected ? "Connected" : `Last seen ${formatDate(peer.lastStatusUpdate)}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard title="Copy NetBird IP" content={peer.netbirdIp} />
                      <Action.CopyToClipboard title="Copy FQDN" content={peer.fqdn} />
                      <Action.CopyToClipboard title="Copy Public Key" content={peer.publicKey} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}
