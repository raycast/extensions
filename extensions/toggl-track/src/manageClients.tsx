import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Workspace } from "@/api";
import ClientForm from "@/components/ClientForm";
import ClientListItem from "@/components/ClientListItem";
import { canModifyProjectIn } from "@/helpers/privileges";
import Shortcut from "@/helpers/shortcuts";
import { useWorkspaces, useClients, useGroups } from "@/hooks";

export default function ClientList() {
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { clients, isLoadingClients, revalidateClients } = useClients();

  const [showArchived, setShowArchived] = useCachedState("showArchivedClients", true);
  const [searchFilter, setSearchFilter] = useState<Workspace>();

  const filteredClients = useMemo(
    () => (showArchived ? clients : clients.filter((client) => !client.archived)),
    [clients, showArchived],
  );
  const groupedClients = useGroups(filteredClients, "wid");

  const clientAdminWorkspaces = workspaces.filter(canModifyProjectIn);
  const SharedActions = (
    <ActionPanel.Section>
      {clientAdminWorkspaces && (
        <Action.Push
          title="Create New Client"
          icon={Icon.Plus}
          shortcut={Shortcut.New}
          target={<ClientForm workspaces={clientAdminWorkspaces} revalidateClients={revalidateClients} />}
        />
      )}
      <Action
        title={`${showArchived ? "Hide" : "Show"} Archived Clients`}
        icon={showArchived ? Icon.Eye : Icon.EyeDisabled}
        shortcut={Shortcut.ShowOrHide}
        onAction={() => setShowArchived((value) => !value)}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingClients}
      actions={<ActionPanel>{SharedActions}</ActionPanel>}
      searchBarAccessory={
        workspaces.length < 2 ? undefined : (
          <List.Dropdown
            tooltip="Filter Clients"
            onChange={(idStr) => setSearchFilter(idStr ? workspaces.find((w) => w.id.toString() === idStr) : undefined)}
          >
            <List.Dropdown.Item title="All" value="" />
            <List.Dropdown.Section>
              {workspaces.map((workspace) => (
                <List.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id.toString()} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {searchFilter ? (
        <>
          {groupedClients[searchFilter.id]?.length == 0 && <List.EmptyView title="No Clients Found" />}
          <List.Section key={searchFilter.id} title={searchFilter.name}>
            {groupedClients[searchFilter.id]?.map((client) => (
              <ClientListItem
                workspace={searchFilter}
                key={client.id}
                {...{ client, revalidateClients, SharedActions }}
              />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          {filteredClients.length == 0 && <List.EmptyView title="No Clients Found" />}
          {workspaces.map((workspace) => (
            <List.Section key={workspace.id} title={workspace.name}>
              {groupedClients[workspace.id]?.map((client) => (
                <ClientListItem
                  workspace={workspace}
                  key={client.id}
                  {...{ client, revalidateClients, SharedActions }}
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
