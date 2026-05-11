import { useEffect, useState } from "react";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { useClients } from "@/hooks/useClients";
import { ClientObject } from "@/types/client";

export function SearchClients() {
  const [searchText, setSearchText] = useState("");
  const [filteredClients, filterClients] = useState<ClientObject[]>([]);

  const { clientsIsLoading, clientsData } = useClients();

  useEffect(() => {
    if (!clientsData) return;

    filterClients(
      clientsData.filter(
        (client) =>
          client?.company_name?.toLowerCase().includes(searchText?.toLowerCase()) ||
          client?.first_name?.toLowerCase().includes(searchText?.toLowerCase()) ||
          client?.last_name?.toLowerCase().includes(searchText?.toLowerCase()),
      ) ?? [],
    );
  }, [clientsData, searchText]);

  return (
    <List
      isLoading={clientsIsLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search clients..."
    >
      {filteredClients?.map((client) => <ClientListItem key={client.id} client={client} />)}
    </List>
  );
}

function ClientListItem({ client }: { client: ClientObject }) {
  return (
    <List.Item
      title={
        client?.company_name ? `${client.company_name} [${client.nip}]` : `${client?.first_name} ${client?.last_name}`
      }
      icon={{
        source: Icon.Person,
        tintColor: Color.PrimaryText,
      }}
      accessories={[
        {
          text: client?.email,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Client Company Name"
              content={
                client?.company_name
                  ? `${client.company_name} [${client.nip}]`
                  : `${client?.first_name} ${client?.last_name}`
              }
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Client ID"
              content={client?.id ?? "No Client ID"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Client Email"
              content={client?.email ?? "No Client Email"}
              shortcut={{ modifiers: ["opt", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
