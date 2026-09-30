import { ReactNode } from "react";
import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { BatchControls, BatchDownloadItem } from "../lib/downloader";

interface DownloadItemActionsProps {
  item: BatchDownloadItem;
  batchHandle: BatchControls | null;
  onRetry: (item: BatchDownloadItem) => void;
  /** Batch-wide actions (Cancel All / Start Over) shown in every item's panel. */
  globalActions?: ReactNode;
}

export function DownloadItemActions({ item, batchHandle, onRetry, globalActions }: DownloadItemActionsProps) {
  return (
    <ActionPanel>
      {item.status === "completed" && item.outputPath && (
        <>
          <Action.Open title="Open File" icon={Icon.Document} target={item.outputPath} />
          {/* No explicit shortcut: ⌘↵ is already the auto-assigned secondary action. */}
          <Action.ShowInFinder path={item.outputPath} />
        </>
      )}
      {item.status === "failed" && (
        <Action
          title="Retry"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => onRetry(item)}
        />
      )}
      {item.status === "downloading" && batchHandle && (
        <Action
          title="Cancel"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => batchHandle.cancelItem(item.id)}
        />
      )}
      <Action.CopyToClipboard title="Copy URL" content={item.url} shortcut={Keyboard.Shortcut.Common.Copy} />
      {item.status === "failed" && item.error && (
        <Action.CopyToClipboard
          title="Copy Error"
          content={item.error}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
      )}
      {globalActions}
    </ActionPanel>
  );
}
