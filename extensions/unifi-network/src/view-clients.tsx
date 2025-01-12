import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { ClientDetail } from "./components/ClientDetail";
import { useClients } from "./hooks/useClients";
import { useUnifi } from "./hooks/useUnifi";
import { connectionTypeIcon } from "./lib/utils";

export default function ViewClients() {
  const { client: unifiClient } = useUnifi();
  const { clients, isLoading, setSearchText, revalidate, error } = useClients({ unifi: unifiClient });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Clients"
      searchBarPlaceholder="Search clients by name, IP address, or MAC address"
      isShowingDetail
      isLoading={isLoading}
    >
      {!clients?.length && <List.Section title="None found..." />}
      {clients?.map((client) => (
        <List.Item
          key={client.id}
          title={client.name}
          accessories={[{ icon: connectionTypeIcon(client.type) }]}
          detail={<ClientDetail client={client} isLoading={isLoading} />}
          actions={
            <ActionPanel title={client.name}>
              <Action.CopyToClipboard title="Copy Ip Address" content={client.ipAddress} />
              <Action.CopyToClipboard title="Copy Mac Address" content={client.macAddress} />
              <Action title="Revalidate" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
      {clients.length === 0 && !isLoading && <List.EmptyView title="No clients found" />}
    </List>
  );
}
