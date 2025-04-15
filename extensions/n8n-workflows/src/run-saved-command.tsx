import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { SavedCommand } from "./types/types";
import { getSavedCommands, deleteSavedCommand } from "./utils/storage-utils";
import { triggerWebhook } from "./utils/n8n-api-utils";
import { EmptyView } from "./components/empty-view"; // Re-use empty view
import ResetStorageForm from "./components/ResetStorageForm";

export default function RunSavedCommand() {
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<number>(0); // To trigger manual refresh

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const commands = await getSavedCommands();
      setSavedCommands(commands);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load saved commands");
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error || "Could not load commands" });
    } finally {
      setLoading(false);
    }
  }, [refresh]); // Depend on refresh state

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  async function handleRunCommand(command: SavedCommand) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Running "${command.name}"...` });
    try {
      // Parse headers back into object
      const headers = command.headers ? JSON.parse(command.headers) : undefined; // Assuming headers were stored as JSON string
      // Body is already stored as string
      const result = await triggerWebhook(command.url, command.method, headers, command.body);

      if (result.ok) {
        toast.style = Toast.Style.Success;
        toast.title = `"${command.name}" Ran Successfully`;
        toast.message = `Status: ${result.status}. Response: ${result.body.substring(0, 100)}${
          result.body.length > 100 ? "..." : ""
        }`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `"${command.name}" Failed`;
        toast.message = `Status: ${result.status}. Response: ${result.body}`;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to Run "${command.name}"`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleDeleteCommand(command: SavedCommand) {
    const options: Alert.Options = {
      title: "Delete Saved Command?",
      message: `Are you sure you want to delete "${command.name}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting "${command.name}"...` });
          try {
            await deleteSavedCommand(command.id);
            toast.style = Toast.Style.Success;
            toast.title = "Command Deleted";
            setRefresh(Date.now()); // Trigger refresh
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to Delete Command";
            toast.message = error instanceof Error ? error.message : String(error);
          }
        },
      },
    };
    await confirmAlert(options);
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search saved commands...">
      {savedCommands.length === 0 && !loading ? (
        <EmptyView
          title="No Saved Commands Found"
          extensionPreferences={false}
          actions={
            <ActionPanel>
              <Action.Push
                title="Reset Storage Data…"
                icon={Icon.Trash}
                target={<ResetStorageForm />}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Saved Commands" subtitle={`${savedCommands.length}`}>
          {savedCommands.map((command) => (
            <List.Item
              key={command.id}
              title={command.name}
              subtitle={`${command.method} ${command.url}`}
              icon={Icon.Terminal} // Or another suitable icon
              actions={
                <ActionPanel>
                  <Action title="Run Command" icon={Icon.Play} onAction={() => handleRunCommand(command)} />
                  <Action
                    title="Delete Command"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDeleteCommand(command)}
                  />
                  <Action.Push
                    title="Reset Storage Data…"
                    icon={Icon.Trash}
                    target={<ResetStorageForm />}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
