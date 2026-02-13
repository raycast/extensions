/**
 * Individual file item in history detail view with metadata
 */

import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { basename } from "path";
import { useFileMetadata } from "../hooks/use-file-metadata";
import { FileMetadataDetail } from "./file-metadata-detail";
import { getFileTypeIcon } from "../lib/file-types";

interface HistoryFileItemProps {
  operation: { oldPath: string; newPath: string };
  showDetail: boolean;
  onToggleDetail: () => void;
  onUndo: () => Promise<void>;
  undoTitle: string;
}

export function HistoryFileItem({ operation, showDetail, onToggleDetail, onUndo, undoTitle }: HistoryFileItemProps) {
  const { metadata, isLoading } = useFileMetadata(showDetail ? operation.newPath : null);

  return (
    <List.Item
      icon={getFileTypeIcon(operation.newPath)}
      title={basename(operation.oldPath)}
      subtitle={showDetail ? undefined : `→ ${basename(operation.newPath)}`}
      accessories={showDetail ? undefined : [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }]}
      detail={
        <FileMetadataDetail
          filePath={operation.newPath}
          originalPath={operation.oldPath}
          metadata={metadata}
          isLoading={isLoading}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDetail}
          />
          <Action title={undoTitle} icon={Icon.Undo} shortcut={{ modifiers: ["cmd"], key: "z" }} onAction={onUndo} />
          <Action.CopyToClipboard
            title="Copy Original Name"
            content={basename(operation.oldPath)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy New Name"
            content={basename(operation.newPath)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy Original Path" content={operation.oldPath} />
          <Action.CopyToClipboard title="Copy New Path" content={operation.newPath} />
          <Action.ShowInFinder path={operation.newPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}
