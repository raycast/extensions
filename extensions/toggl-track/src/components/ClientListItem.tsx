import { List, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";

import { Workspace, Client, deleteClient, archiveClient, restoreClient } from "@/api";
import ClientForm from "@/components/ClientForm";
import { canModifyProjectIn } from "@/helpers/privileges";
import Shortcut from "@/helpers/shortcuts";
import { withToast, Verb } from "@/helpers/withToast";

interface ClientListItemProps {
  workspace: Workspace;
  client: Client;
  revalidateClients: () => void;
  SharedActions: React.ReactNode;
}

export default function ClientListItem({ workspace, client, revalidateClients, SharedActions }: ClientListItemProps) {
  return (
    <List.Item
      title={client.name}
      key={client.id}
      accessories={client.archived ? [{ tag: "archived", icon: Icon.Tray }] : undefined}
      actions={
        <ActionPanel>
          {canModifyProjectIn(workspace) && (
            <ActionPanel.Section>
              <Action.Push
                title="Rename Client"
                icon={Icon.Pencil}
                shortcut={Shortcut.Edit}
                target={<ClientForm {...{ client, revalidateClients }} />}
              />
              <Action
                title="Delete Client"
                icon={Icon.Trash}
                shortcut={Shortcut.Remove}
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
              {workspace.business_ws &&
                (client.archived ? (
                  <ActionPanel.Submenu title="Restore Client..." icon={Icon.Undo} shortcut={Shortcut.Archive}>
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
                    shortcut={Shortcut.Archive}
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
                ))}
            </ActionPanel.Section>
          )}
          {SharedActions}
        </ActionPanel>
      }
    />
  );
}
