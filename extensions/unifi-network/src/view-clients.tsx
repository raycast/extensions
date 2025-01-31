/* eslint-disable @raycast/prefer-title-case */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api";
import { memo, useEffect } from "react";
import ClientDetail from "./components/ClientDetail";
import { useClients } from "./hooks/useClients";
import { useUnifi } from "./hooks/useUnifi";
import { connectionTypeIcon } from "./lib/utils";

function ViewClients(props: LaunchProps) {
  const { client: unifiClient } = useUnifi();
  const { clients, isLoading, setSearchText, searchText, error } = useClients({
    unifi: unifiClient,
    search: props.arguments.search,
  });

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
      searchText={searchText}
      navigationTitle="Search Clients"
      searchBarPlaceholder="Search clients by name, IP address, or MAC address"
      isShowingDetail
      isLoading={isLoading}
    >
      {!clients?.length && <List.Section title="None found..." />}
      {Object.entries(clients).map(([key, clients]) => (
        <List.Section key={key} title={`${key}`}>
          {clients.map((client) => (
            <List.Item
              key={client.id}
              title={client.name}
              subtitle={client.ipAddress}
              icon={{
                source: connectionTypeIcon(client.type),
                tintColor: Color.Blue,
              }}
              detail={<ClientDetail client={client} isLoading={isLoading} />}
              actions={
                <ActionPanel title={client.name}>
                  <Action.CopyToClipboard title="Copy IP Address" content={client.ipAddress} />
                  <Action.CopyToClipboard title="Copy Mac Address" content={client.macAddress} />
                  <Action icon={Icon.Cog} title="Open Command Preferences" onAction={openCommandPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {Object.keys(clients).length === 0 && !isLoading && <List.EmptyView title="No clients found" />}
    </List>
  );
}

export default memo(ViewClients);
