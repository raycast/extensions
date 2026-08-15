import { List, ActionPanel, Action, Icon, Color, Toast, showToast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { clearHistory, deleteRemoteFile, getHistory, removeHistoryItem, UploadHistoryItem } from "./storage";

export default function Command() {
  const [items, setItems] = useState<UploadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setItems(await getHistory());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(item: UploadHistoryItem) {
    const confirmed = await confirmAlert({
      title: "Delete File",
      message: item.token
        ? `This permanently deletes "${item.fileName}" from ${item.instanceUrl} and removes it from history.`
        : `No management token is stored for "${item.fileName}", so it can't be deleted remotely. Remove it from history?`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast(Toast.Style.Animated, "Deleting", item.fileName);

    if (item.token) {
      try {
        await deleteRemoteFile(item);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Delete failed";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
        return;
      }
    }

    // Remote delete succeeded (or no token). Best-effort local cleanup —
    // failure here must not leave the toast in the animated "Deleting" state,
    // and the user should know the remote file is already gone.
    try {
      await removeHistoryItem(item.url);
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = item.token ? "File deleted" : "Removed from history";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = item.token ? "File deleted — history not updated" : "History update failed";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      await refresh().catch(() => undefined);
    }
  }

  async function handleRemove(item: UploadHistoryItem) {
    await removeHistoryItem(item.url);
    await refresh();
    await showToast(Toast.Style.Success, "Removed from history", item.fileName);
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message:
        "This removes all entries from your local upload history. The files themselves are not deleted from the server.",
      icon: Icon.Trash,
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    await clearHistory();
    await refresh();
    await showToast(Toast.Style.Success, "History cleared");
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search uploaded files...">
      <List.EmptyView
        icon={Icon.Upload}
        title="No Uploads Yet"
        description="Files you upload with the Upload File command will appear here."
      />
      {items.map((item) => {
        const accessories: List.Item.Accessory[] = [
          { date: new Date(item.uploadedAt), tooltip: `Uploaded ${new Date(item.uploadedAt).toLocaleString()}` },
        ];
        if (item.expiresAt) {
          accessories.unshift({
            icon: Icon.Clock,
            tooltip: `Expires ${new Date(item.expiresAt).toLocaleString()}`,
          });
        }
        if (!item.token) {
          accessories.unshift({
            icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
            tooltip: "No management token stored — cannot be deleted remotely",
          });
        }

        return (
          <List.Item
            key={item.url}
            icon={Icon.Document}
            title={item.fileName}
            subtitle={item.url}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy Link" content={item.url} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete File"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDelete(item)}
                  />
                  <Action
                    title="Remove from History"
                    icon={Icon.XMarkCircle}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={() => handleRemove(item)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refresh}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "backspace" },
                    }}
                    onAction={handleClearAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
