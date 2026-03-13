/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { memo, useEffect } from "react";
import ClientDetail from "../views/ClientDetail";
import useClients from "../hooks/use-clients";
import useUnifi from "../hooks/use-unifi";
import { connectionTypeIcon } from "../lib/utils";

import SelectSite from "../select-site";

// Separate component for modern auth flow
function ViewClients(props: { arguments: { search?: string } }) {
  const { client: unifiClient, siteIsLoading, site } = useUnifi();
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

  if (!site && !siteIsLoading) {
    return <SelectSite />;
  }

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      navigationTitle="Search Clients"
      searchBarPlaceholder="Search clients by name, IP address, or MAC address"
      isShowingDetail
      isLoading={isLoading || siteIsLoading}
    >
      {Object.entries(clients)?.map(([key, clients]) => (
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

      {clients && !isLoading && !siteIsLoading && <List.EmptyView title="No clients found" />}
    </List>
  );
}

export default memo(ViewClients);
