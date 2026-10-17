import { useRef } from "react";
import { Action, ActionPanel, Alert, Icon, List, confirmAlert, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PveServer } from "@/types";
import { isPreferencesServer, useServers } from "@/utils/servers";
import { ServerForm } from "@/screens/ServerForm";

export const ManageServers = () => {
  const { servers, isLoading, addServer, updateServer, removeServer } = useServers();
  const pendingRemovalIds = useRef(new Set<string>());

  const addServerAction = (
    <Action.Push
      title="Add Server"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<ServerForm onSave={addServer} />}
    />
  );

  const handleUpdate = async (server: PveServer, values: Omit<PveServer, "id">) => {
    if (pendingRemovalIds.current.has(server.id)) {
      const error = new Error("This server was removed");
      await showFailureToast(error, { title: "Failed to Update Server" });
      throw error;
    }

    try {
      await updateServer({ id: server.id, ...values });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Update Server" });
      throw error;
    }
  };

  const handleRemove = async (server: PveServer) => {
    const confirmed = await confirmAlert({
      title: "Remove Server",
      message: `Are you sure you want to remove ${server.name}?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    pendingRemovalIds.current.add(server.id);
    try {
      await removeServer(server);
    } catch (error) {
      pendingRemovalIds.current.delete(server.id);
      await showFailureToast(error, { title: "Failed to Remove Server" });
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Manage Servers">
      <List.EmptyView
        icon={Icon.HardDrive}
        title="No Proxmox Servers Configured"
        description="Add your first server here, or set one in the extension preferences."
        actions={
          <ActionPanel>
            {addServerAction}
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {servers.map((server) => (
        <List.Item
          key={server.id}
          icon={Icon.HardDrive}
          title={server.name}
          subtitle={server.url}
          accessories={
            isPreferencesServer(server)
              ? [{ tag: "Preferences", tooltip: "This server is configured in the extension preferences" }]
              : []
          }
          actions={
            <ActionPanel>
              {isPreferencesServer(server) ? (
                <Action title="Edit in Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              ) : (
                <Action.Push
                  title="Edit Server"
                  icon={Icon.Pencil}
                  target={<ServerForm server={server} onSave={(values) => handleUpdate(server, values)} />}
                />
              )}
              {addServerAction}
              {!isPreferencesServer(server) && (
                <Action
                  title="Remove Server"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemove(server)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
