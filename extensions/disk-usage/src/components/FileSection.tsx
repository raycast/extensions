import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { FC } from "react";
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
  const isSelected = selection.has(node.path);
  const isDeletingThis = isDeleting && isSelected;

  const isFolderWithContent = hasStoredSnapshot(node.path);

  const handleToggle = () => selection.toggle(node.path);
  const handleClear = () => selection.clear();
  const handleTrash = () => {
    const paths = selectionStore.size > 0 ? selectionStore.getAll() : [node.path];
    send({ type: "DELETE_ITEMS", paths });
  };
  const handleRefresh = () => send({ type: "REFRESH" });

  return (
    <List.Item
      subtitle={node.name}
      title={isDeletingThis ? "Moving to Trash..." : node.formattedSize}
      icon={isSelected ? Icon.CheckCircle : { fileIcon: node.path }}
      accessories={[isDeletingThis ? { icon: Icon.CircleProgress } : { text: createUsageBar(node.bytes, maxSize) }]}
      actions={
        <ActionPanel>
          {isFolderWithContent ? (
            <Action.Push
              title="Open Folder"
              icon={Icon.ArrowRight}
              onPush={handleClear}
              target={<FolderView title={node.name} rootPath={node.path} send={send} isDeleting={isDeleting} />}
            />
          ) : (
            <Action.ShowInFinder path={node.path} />
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
            paths={selectionStore.size > 0 ? selectionStore.getAll() : [node.path]}
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

FileRow.displayName = "FileRow";

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
