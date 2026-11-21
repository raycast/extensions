/**
 * Individual file item in history detail view (simplified -- no metadata dependencies)
 */

import { useMemo } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { basename, dirname } from "path";
import {
  isPreviewableImage,
  readTextPreview,
  toCodeFenceMarkdown,
  toFileUri,
  getFileStats,
  formatFileSize,
} from "../lib/file-preview";
import type { HistoryOperation } from "../types";

interface HistoryFileItemProps {
  operation: HistoryOperation;
  showDetail: boolean;
  onToggleDetail: () => void;
  /** Undo just this file. Absent when the file is already undone. */
  onUndoFile?: () => Promise<void>;
  /** Undo every remaining file in the entry. Absent when nothing is left to undo. */
  onUndoEntry?: () => Promise<void>;
  undoEntryTitle: string;
}

function getStatusAccessory(operation: HistoryOperation): List.Item.Accessory {
  if (operation.status === "undone") {
    return { icon: { source: Icon.Undo, tintColor: Color.SecondaryText }, tooltip: "Undone" };
  }
  if (operation.status === "undo-failed") {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      tooltip: operation.undoError ?? "Undo failed",
    };
  }
  return { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Renamed" };
}

function getStatusMetadata(operation: HistoryOperation): { text: string; icon: { source: Icon; tintColor: Color } } {
  if (operation.status === "undone") {
    return { text: "Undone", icon: { source: Icon.Undo, tintColor: Color.SecondaryText } };
  }
  if (operation.status === "undo-failed") {
    return {
      text: `Could not undo — ${operation.undoError ?? "unknown reason"}`,
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
    };
  }
  return { text: "Renamed", icon: { source: Icon.CheckCircle, tintColor: Color.Green } };
}

export function HistoryFileItem({
  operation,
  showDetail,
  onToggleDetail,
  onUndoFile,
  onUndoEntry,
  undoEntryTitle,
}: HistoryFileItemProps) {
  const oldName = basename(operation.oldPath);
  const newName = basename(operation.newPath);
  // After an undo, the file is back at its original path
  const currentPath = operation.status === "undone" ? operation.oldPath : operation.newPath;
  const directory = dirname(operation.newPath);
  const status = getStatusMetadata(operation);

  // Stat and preview reads hit the filesystem, so only run them when the
  // detail panel is actually visible, and not again on every re-render.
  // Image files get an inline preview; anything else gets a text snippet if
  // its content sniffs as text, or no markdown so the metadata panel fills
  // the whole detail.
  const { stats, markdown } = useMemo(() => {
    if (!showDetail) {
      return { stats: undefined, markdown: undefined };
    }
    const fileStats = getFileStats(currentPath);
    let md: string | undefined;
    if (fileStats && isPreviewableImage(currentPath)) {
      md = `![Preview](${toFileUri(currentPath)})`;
    } else if (fileStats) {
      const snippet = readTextPreview(currentPath);
      if (snippet !== undefined) {
        md = toCodeFenceMarkdown(snippet);
      }
    }
    return { stats: fileStats, markdown: md };
  }, [showDetail, currentPath]);

  return (
    <List.Item
      icon={{ fileIcon: currentPath }}
      title={oldName}
      subtitle={showDetail ? undefined : `→ ${newName}`}
      accessories={showDetail ? undefined : [getStatusAccessory(operation)]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Original" text={oldName} />
              <List.Item.Detail.Metadata.Label title="Renamed To" text={newName} />
              <List.Item.Detail.Metadata.Label title="Status" text={status.text} icon={status.icon} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Directory" text={directory} />
              {stats ? (
                <>
                  <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(stats.size)} />
                  <List.Item.Detail.Metadata.Label
                    title="Modified"
                    text={new Date(stats.modifiedMs).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                </>
              ) : (
                <List.Item.Detail.Metadata.Label
                  title="File"
                  text="Not found at this location"
                  icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDetail}
          />
          {onUndoFile && (
            <Action
              title="Undo This File"
              icon={Icon.Undo}
              shortcut={{ modifiers: ["cmd"], key: "z" }}
              onAction={onUndoFile}
            />
          )}
          {onUndoEntry && (
            <Action
              title={undoEntryTitle}
              icon={Icon.Undo}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
              onAction={onUndoEntry}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Original Name"
            content={oldName}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy New Name"
            content={newName}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy Original Path" content={operation.oldPath} />
          <Action.CopyToClipboard title="Copy New Path" content={operation.newPath} />
          <Action.ShowInFinder path={currentPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}
