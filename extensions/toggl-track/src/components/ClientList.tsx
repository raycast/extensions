import { useMemo } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useClients } from "../hooks";
import { Workspace, deleteClient, archiveClient, restoreClient } from "../api";
import ClientForm from "./ClientForm";
import { withToast, Verb } from "../helpers/withToast";

interface ClientListProps {
  workspace: Workspace;
  isLoading: boolean;
}

export default function ClientList({ workspace, isLoading }: ClientListProps) {
  const { clients, isLoadingClients, revalidateClients } = useClients();

  const [showArchived, setShowArchived] = useCachedState("showArchivedClients", true);

  const filteredClients = useMemo(
    () => clients.filter((client) => !(!showArchived && client.archived) && client.wid === workspace.id),
    [clients, showArchived],
  );

  const canModifyClients = useMemo(
    () => !workspace.only_admins_may_create_projects || workspace.role == "admin" || workspace.role == "projectlead",
    [workspace],
  );

  return (
    <List
      isLoading={isLoading || isLoadingClients}
      actions={
        <ActionPanel>
          <Action
            title={`${showArchived ? "Hide" : "Show"} Archived Clients`}
            icon={showArchived ? Icon.Eye : Icon.EyeDisabled}
            onAction={() => setShowArchived((value) => !value)}
          />
        </ActionPanel>
      }
    >
      {filteredClients.length == 0 && <List.EmptyView title="No Clients Found" />}
      {filteredClients.map((client) => (
        <List.Item
          title={client.name}
          key={client.id}
          accessories={client.archived ? [{ tag: "archived", icon: Icon.Tray }] : undefined}
          actions={
            <ActionPanel>
              {canModifyClients && (
                <>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Rename Tag"
                      icon={Icon.Pencil}
                      shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
                      target={<ClientForm {...{ client, workspace, revalidateClients }} />}
                    />
                    <Action
                      title="Delete Tag"
                      icon={Icon.Trash}
                      shortcut={{ key: "x", modifiers: ["ctrl"] }}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Delete Client",
                            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                            message:
                              "Deleting a client will permanently remove the client from all associated time entries and projects.",
                          })
                        )
                          await withToast({
                            noun: "Client",
                            verb: Verb.Delete,
                            message: client.name,
                            action: async () => {
                              await deleteClient(client.wid, client.id);
                              revalidateClients();
                            },
                          });
                      }}
                    />
                    {client.archived ? (
                      <ActionPanel.Submenu title="Restore Client..." icon={Icon.Undo}>
                        <Action
                          title={`Restore Client and Projects`}
                          onAction={() =>
                            withToast({
                              noun: "Client",
                              verb: Verb.Restore,
                              message: client.name,
                              action: async () => {
                                await restoreClient(client.wid, client.id, true);
                                revalidateClients();
                              },
                            })
                          }
                        />
                        <Action
                          title={`Restore Only Client`}
                          onAction={() =>
                            withToast({
                              noun: "Client",
                              verb: Verb.Restore,
                              message: client.name,
                              action: async () => {
                                await restoreClient(client.wid, client.id, false);
                                revalidateClients();
                              },
                            })
                          }
                        />
                      </ActionPanel.Submenu>
                    ) : (
                      <Action
                        title={`Archive Client`}
                        icon={Icon.Tray}
                        onAction={async () => {
                          if (
                            await confirmAlert({
                              title: "Archive Client",
                              primaryAction: { title: "Archive" },
                              message: "Any projects associated with this client will also be archived.",
                            })
                          )
                            await withToast({
                              noun: "Client",
                              verb: Verb.Archive,
                              message: client.name,
                              action: async () => {
                                await archiveClient(client.wid, client.id);
                                revalidateClients();
                              },
                            });
                        }}
                      />
                    )}
                  </ActionPanel.Section>
                  <Action.Push
                    title="Create New Tag"
                    icon={Icon.Plus}
                    shortcut={{ key: "n", modifiers: ["cmd", "shift"] }}
                    target={<ClientForm {...{ workspace, revalidateClients }} />}
                  />
                </>
              )}
              <Action
                title={`${showArchived ? "Hide" : "Show"} Archived Clients`}
                icon={showArchived ? Icon.Eye : Icon.EyeDisabled}
                onAction={() => setShowArchived((value) => !value)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
