import { List } from "@raycast/api";
import type { FC } from "react";
import { useFileSystemIndexStore } from "../hooks/use-file-system-index-store";
import { useSelection } from "../hooks/use-selection";
import { FileSection } from "./FileSection";
import type { DiskUsageSend } from "../machines/disk-usage-machine";
import { RestrictedSection } from "./RestrictedSection";

export const FolderView: FC<{
  title: string;
  rootPath: string;
  send: DiskUsageSend;
  isDeleting: boolean;
}> = ({ title, rootPath, send, isDeleting }) => {
  const fsIndex = useFileSystemIndexStore();
  const selection = useSelection();

  const snapshot = fsIndex?.[rootPath] || { accessible: [], restricted: [] };

  const selectionInfo = selection.size > 0 ? `(${selection.size} selected)` : "";

  return (
    <List navigationTitle={`${title} ${selectionInfo}`} searchBarPlaceholder={`Search in ${title}...`}>
      {snapshot.accessible.length > 0 && (
        <FileSection title={title} items={snapshot.accessible} send={send} isDeleting={isDeleting} />
      )}

      {snapshot.restricted.length > 0 && <RestrictedSection items={snapshot.restricted} />}
    </List>
  );
};
