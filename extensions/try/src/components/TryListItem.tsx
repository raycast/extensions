import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { rmSync } from "fs";
import { TryDirectory } from "../types";
import { formatRelativeTime, touchDirectory } from "../lib/utils";
import { CreateForm } from "./CreateForm";
import { CloneForm } from "./CloneForm";

interface TryListItemProps {
  directory: TryDirectory;
  onRefresh: () => void;
}

export function TryListItem({ directory, onRefresh }: TryListItemProps) {
  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Directory",
      message: `Are you sure you want to delete "${directory.name}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        rmSync(directory.path, { recursive: true, force: true });
        showToast({
          style: Toast.Style.Success,
          title: "Deleted",
          message: directory.name,
        });
        onRefresh();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: String(error),
        });
      }
    }
  };

  return (
    <List.Item
      icon={Icon.Folder}
      title={directory.displayName || directory.name}
      subtitle={directory.datePrefix}
      accessories={[{ text: formatRelativeTime(directory.mtime) }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenWith path={directory.path} onOpen={() => touchDirectory(directory.path)} />
            <Action.ShowInFinder path={directory.path} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={directory.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Create New Directory"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateForm onSuccess={onRefresh} />}
            />
            <Action.Push
              title="Clone Repository"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              target={<CloneForm onSuccess={onRefresh} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
