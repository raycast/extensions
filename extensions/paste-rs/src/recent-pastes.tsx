import { useEffect, useState } from "react";
import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { deletePaste } from "./api";
import { PasteRecord, clearHistory, getHistory, removeFromHistory } from "./history";

function title(record: PasteRecord): string {
  const firstLine =
    record.content
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.trim() ?? "";
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine || "(empty)";
}

function detailMarkdown(record: PasteRecord): string {
  return `\`\`\`\n${record.content}\n\`\`\``;
}

export default function RecentPastes() {
  const [items, setItems] = useState<PasteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    getHistory().then((history) => {
      setItems(history);
      setIsLoading(false);
    });
  }, []);

  async function handleDelete(record: PasteRecord) {
    const confirmed = await confirmAlert({
      title: "Delete paste?",
      message: "This permanently deletes the paste on paste.rs and removes it from your history.",
      primaryAction: { title: "Delete Paste", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting paste" });

    try {
      await deletePaste(record.url);
      const next = await removeFromHistory(record.id);
      setItems(next);
      toast.style = Toast.Style.Success;
      toast.title = "Paste deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete paste";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleRemoveLocal(record: PasteRecord) {
    const next = await removeFromHistory(record.id);
    setItems(next);
    await showToast({ style: Toast.Style.Success, title: "Removed from history" });
  }

  async function handleClear() {
    const confirmed = await confirmAlert({
      title: "Clear paste history?",
      message: "This clears your local history only. Pastes are not deleted on paste.rs.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    await clearHistory();
    setItems([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail && items.length > 0}>
      <List.EmptyView
        icon={Icon.Link}
        title="No Pastes Yet"
        description="Pastes you create with Raycast will show up here."
      />
      {items.map((record) => (
        <List.Item
          key={record.id}
          icon={record.partial ? { source: Icon.ExclamationMark, tintColor: Color.Yellow } : Icon.Link}
          title={title(record)}
          subtitle={showingDetail ? undefined : record.url}
          accessories={showingDetail ? undefined : [{ date: new Date(record.createdAt) }]}
          detail={
            <List.Item.Detail
              markdown={detailMarkdown(record)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="URL" text={record.url} target={record.url} />
                  <List.Item.Detail.Metadata.Label title="Created" text={new Date(record.createdAt).toLocaleString()} />
                  {record.partial && (
                    <List.Item.Detail.Metadata.Label
                      title="Upload"
                      text="Partial (exceeded size limit)"
                      icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy URL"
                content={record.url}
                icon={Icon.Link}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              <Action.CopyToClipboard
                title="Copy Content"
                content={record.content}
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.Paste
                title="Paste Content to App"
                content={record.content}
                icon={Icon.Text}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "v" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "v" },
                }}
              />
              <Action.OpenInBrowser url={record.url} shortcut={Keyboard.Shortcut.Common.Open} />
              <Action
                title="Toggle Details"
                icon={Icon.Sidebar}
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                onAction={() => setShowingDetail((prev) => !prev)}
              />
              <ActionPanel.Section>
                <Action
                  title="Delete Paste"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(record)}
                />
                <Action
                  title="Remove from History"
                  icon={Icon.XMarkCircle}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "backspace" },
                    Windows: { modifiers: ["ctrl"], key: "backspace" },
                  }}
                  onAction={() => handleRemoveLocal(record)}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={handleClear}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
