import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useServers } from "../../hooks/useServers";
import { IServer } from "../../types";
import { EmptyView } from "../../components/EmptyView";
import { ServerSingle } from "./ServerSingle";
import { ServerCommands } from "../actions/ServerCommands";
import { getServerColor } from "../../lib/color";
import { useSites } from "../../hooks/useSites";
import { useServerKeywords } from "../../hooks/useServerKeywords";
import { useEffect, useMemo, useState } from "react";

export const ServersList = ({ search }: { search: string }) => {
  const [preLoadedServer, setPreLoadedServer] = useState<IServer>();
  const { servers: found, loading, error, refresh } = useServers();
  const keywords = useServerKeywords();
  const servers = useMemo(
    () => found?.map((server) => ({ ...server, keywords: keywords?.[server.id] ?? [] })),
    [found, keywords],
  );
  const [incomingSearch, setIncomingSearch] = useState(search);
  useSites(preLoadedServer, {
    // Immutable
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { push } = useNavigation();

  useEffect(() => {
    if (!incomingSearch) return;
    const server =
      // First match by ID, then if not do a full search
      servers?.find((server) => server.id.toString() === incomingSearch) ||
      servers?.find((server) => JSON.stringify(server).includes(incomingSearch));
    if (!server) return;
    showToast(Toast.Style.Success, server?.name ? `Now showing: ${server.name}` : `Now showing: #${server.id}`);
    push(<ServerSingle server={server} />);
    setIncomingSearch("");
  }, [incomingSearch, servers]);

  const preFetchSites = (serverId: string | null) => {
    const server = servers?.find((server) => server.id.toString() === serverId);
    setPreLoadedServer(server);
  };

  if (error?.message) {
    return <EmptyView title={`Error: ${error.message}`} />;
  }
  if (servers?.length === 0 && !loading) {
    return <EmptyView title="No servers found" />;
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search servers..." onSelectionChange={preFetchSites}>
      {servers?.map((server: IServer) => {
        return <ServerListItem key={server.id} server={server} onRefresh={refresh} />;
      })}
    </List>
  );
};

const ServerListItem = ({ server, onRefresh }: { server: IServer; onRefresh: () => void }) => {
  if (!server?.id) return null;
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      keywords={server.keywords}
      accessories={[{ text: server?.keywords?.join(", ") ?? "" }]}
      title={server?.name ?? "Server name undefined"}
      icon={{
        source: Icon.Box,
        tintColor: getServerColor(server?.provider ?? ""),
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Server Information"
              icon={Icon.Binoculars}
              target={<ServerSingle server={server} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ServerCommands server={server} />
            <Action
              title="Refresh Servers"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
