import { FC } from "react";
import { useFileSystemIndexStore } from "../hooks/use-file-system-index-store";
import { useSelection } from "../hooks/use-selection";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { createUsageBar } from "../utils/format";
import selectionStore from "../stores/selection-store";
import type { FileNode, FileSystemIndex } from "../types";
import type { DiskUsageSend } from "../machines/disk-usage-machine";
import { FolderView } from "./FolderView";
import { PathLike } from "fs";

const FileRow: FC<{
  node: FileNode;
  maxSize: number;
  send: DiskUsageSend;
  isDeleting: boolean;
  fsIndex: FileSystemIndex;
}> = ({ node, maxSize, send, isDeleting, fsIndex }) => {
  const selection = useSelection();

  const isSelected = selection.has(node.path);
  const isDeletingThis = isDeleting && isSelected;
  const isFolderOrHaveChild = !!fsIndex[node.path];

  const paths: PathLike[] = selectionStore.size > 0 ? selectionStore.getAll() : [node.path];

  return (
    <List.Item
      subtitle={node.name}
      title={isDeletingThis ? "Moving to Trash..." : node.formattedSize}
      icon={isSelected ? Icon.CheckCircle : { fileIcon: node.path }}
      accessories={[isDeletingThis ? { icon: Icon.CircleProgress } : { text: createUsageBar(node.bytes, maxSize) }]}
      actions={
        <ActionPanel>
          {isFolderOrHaveChild ? (
            <Action.Push
              title="Open Folder"
              icon={Icon.ArrowRight}
              onPush={() => {
                selection.clear();
              }}
              target={<FolderView title={node.name} rootPath={node.path} send={send} isDeleting={isDeleting} />}
            />
          ) : (
            <Action.ShowInFinder path={node.path} />
          )}
          <Action
            title={isSelected ? "Deselect" : "Select"}
            icon={isSelected ? Icon.Circle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => selection.toggle(node.path)}
          />
          <Action.ShowInFinder path={node.path} />
          <Action.Trash
            paths={paths}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onTrash={() => {
              send({ type: "DELETE_ITEMS", paths });
            }}
          />
          <Action
            title="Rescan (Clear Cache)"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => send({ type: "REFRESH" })}
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
  const fsIndex = useFileSystemIndexStore();
  const maxSize = items[0]?.bytes || 0;

  return (
    <List.Section title={`Contents of ${title}`}>
      {items.map((node) => (
        <FileRow
          key={node.path}
          node={node}
          maxSize={maxSize}
          isDeleting={isDeleting}
          send={send}
          fsIndex={fsIndex || {}}
        />
      ))}
    </List.Section>
  );
};
