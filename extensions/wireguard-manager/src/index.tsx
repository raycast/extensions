import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  List,
  LocalStorage,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Connection, getWireguardConnections, toggleConnection } from "./Wireguard";

async function GetRecents(connections: Connection[]) {
  const _recents = (await LocalStorage.getItem<string>("recents")) || "";
  const recents = _recents.split(",").filter((r) => r !== "");
  const recentConnections = connections.filter((c) => recents.includes(c.name));
  console.log({ recents, recentConnections, connections });
  return recentConnections;
}

export default function Command() {
  const { isLoading, data, error } = usePromise(getWireguardConnections);
  const [recentConnections, setRecentConnections] = useState<Connection[]>([]);
  const { available, connected } = data || { available: [], connected: undefined };
  console.log({ recentConnections });
  useEffect(() => {
    GetRecents(available).then(setRecentConnections);
  }, [available]);

  if (error) return <Detail isLoading={isLoading} markdown="Something went wrong" />;
  return (
    // Recents connections
    <List isLoading={isLoading}>
      {connected && <ConnectionItem connection={connected} title="Disconnect" subtitle="Connected" />}
      <List.Section title="Recent Connections">
        {recentConnections.map((connection, i) => (
          <ConnectionItem key={i} connection={connection} title="Connect" />
        ))}
      </List.Section>
      <List.Section title="Available Connections">
        {available.map((connection, i) => (
          <ConnectionItem key={i} connection={connection} title="Connect" />
        ))}
      </List.Section>
    </List>
  );
}

function ConnectionItem({
  connection,
  title,
  subtitle,
}: {
  connection: Connection;
  title: string;
  subtitle?: string;
}): JSX.Element {
  return (
    <List.Item
      icon={connection.flag}
      title={connection.name}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action
            title={title}
            onAction={() => {
              toggleConnection(connection).then(() => {
                closeMainWindow({ popToRootType: PopToRootType.Default });
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
