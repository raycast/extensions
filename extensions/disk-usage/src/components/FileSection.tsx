import { Action, ActionPanel, Icon, List, showInFinder, showToast, Toast, useNavigation } from "@raycast/api";
import type { FC } from "react";
import { access, constants } from "node:fs/promises";
import { useSelection } from "../hooks/use-selection";
import type { DiskUsageSend } from "../machines/disk-usage-machine";
import selectionStore from "../stores/selection-store";
import type { FileNode } from "../types";
import { createUsageBar } from "../utils/format";
import { hasStoredSnapshot } from "../utils/storage";
import { FolderView } from "./FolderView";

const FileRow: FC<{
  node: FileNode;
  maxSize: number;
  send: DiskUsageSend;
  isDeleting: boolean;
}> = ({ node, maxSize, send, isDeleting }) => {
  const selection = useSelection();
  const { push } = useNavigation();
  const isSelected = selection.has(node.path);
  const isDeletingThis = isDeleting && isSelected;
  const isFolderWithContent = hasStoredSnapshot(node.path);

  const handleError = (error: unknown, action: string) => {
    const isFileNotFound = (error as NodeJS.ErrnoException)?.code === "ENOENT";

    showToast({
      style: Toast.Style.Failure,
      title: isFileNotFound ? "Folder missing" : "Error",
      message: isFileNotFound ? "Removing from list..." : `Cannot ${action} folder`,
    });

    if (isFileNotFound) {
      send({ type: "ITEM_MISSING", path: node.path, bytes: node.bytes });
    }
  };

  const handleToggle = () => {
    selection.toggle(node.path);
  };

  const handleShowInFinder = async () => {
    selection.clear();
    try {
      await showInFinder(node.path);
    } catch (error) {
      handleError(error, "access");
    }
  };

  const handleEnterFolder = async () => {
    selection.clear();
    try {
      await access(node.path, constants.F_OK);
      push(<FolderView title={node.name} rootPath={node.path} send={send} isDeleting={isDeleting} />);
    } catch (error) {
      handleError(error, "open");
    }
  };

  const handleTrash = () => {
    send({ type: "DELETE_ITEMS", paths: selectionStore.size > 0 ? selectionStore.getAll() : [node.path] });
  };

  const handleRefresh = () => {
    send({ type: "REFRESH" });
  };

  const getSelectedPaths = () => {
    return selectionStore.size > 0 ? selectionStore.getAll() : [node.path];
  };

  const itemIcon = isSelected ? Icon.CheckCircle : { fileIcon: node.path };
  const itemTitle = isDeletingThis ? "Moving to Trash..." : node.formattedSize;
  const itemAccessories = isDeletingThis
    ? [{ icon: Icon.CircleProgress }]
    : [{ text: createUsageBar(node.bytes, maxSize) }];

  return (
    <List.Item
      subtitle={node.name}
      title={itemTitle}
      icon={itemIcon}
      accessories={itemAccessories}
      actions={
        <ActionPanel>
          {isFolderWithContent ? (
            <Action title="Open Folder" icon={Icon.ArrowRight} onAction={handleEnterFolder} />
          ) : (
            <Action title="Show in Finder" icon={Icon.Finder} onAction={handleShowInFinder} />
          )}

          <Action.CopyToClipboard
            title="Copy Path"
            content={node.path}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />

          <Action
            title={isSelected ? "Deselect" : "Select"}
            icon={isSelected ? Icon.Circle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleToggle}
          />

          <Action.Trash
            paths={getSelectedPaths()}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onTrash={handleTrash}
          />

          <Action
            title="Rescan All"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleRefresh}
          />
        </ActionPanel>
      }
    />
  );
};

export const FileSection: FC<{
  title: string;
  items: FileNode[];
  send: DiskUsageSend;
  isDeleting: boolean;
}> = ({ title, items, send, isDeleting }) => {
  const maxSize = items[0]?.bytes || 0;

  return (
    <List.Section title={`Contents of ${title}`}>
      {items.map((node) => (
        <FileRow key={node.path} node={node} maxSize={maxSize} isDeleting={isDeleting} send={send} />
      ))}
    </List.Section>
  );
};
