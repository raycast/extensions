import { Action, ActionPanel, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { DownloadHistoryItem } from "../lib/history";

interface HistoryItemActionsProps {
  item: DownloadHistoryItem;
  onRemove: (item: DownloadHistoryItem) => void;
  onClearByAge: (minutes: number) => void;
  onClearAll: () => void;
}

/**
 * Actions for one history row, grouped the way Clipboard Manager groups its own:
 * act → copy → delete, each in its own section.
 *
 * The delete wording is deliberate. Every destructive action here removes the
 * **history entry only** — the downloaded file on disk is never touched. "Delete
 * Downloads" read as though it deleted the files, so these say "Entry"/"Entries",
 * which is what they actually operate on.
 */
export function HistoryItemActions({ item, onRemove, onClearByAge, onClearAll }: HistoryItemActionsProps) {
  // A record whose URL was withheld (signed URLs are omitted — they carry a
  // credential and expire) has nothing to re-request, so the action is hidden
  // rather than offered as a button that silently does nothing.
  const url = item.url;
  const redownload = url
    ? () => launchCommand({ name: "download", type: LaunchType.UserInitiated, arguments: { url } })
    : undefined;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {item.status === "completed" && item.outputPath && (
          <>
            <Action.Open title="Open File" icon={Icon.Document} target={item.outputPath} />
            {/* No explicit shortcut: ⌘↵ is already the auto-assigned secondary action. */}
            <Action.ShowInFinder path={item.outputPath} />
          </>
        )}
        {redownload && (
          <Action
            title={item.status === "failed" ? "Retry Download" : "Download Again"}
            icon={item.status === "failed" ? Icon.ArrowClockwise : Icon.Download}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={redownload}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        {item.url && (
          <Action.CopyToClipboard title="Copy URL" content={item.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        )}
        {item.outputPath && (
          <Action.CopyToClipboard
            title="Copy File Path"
            content={item.outputPath}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        )}
        {item.status === "failed" && item.error && (
          <Action.CopyToClipboard
            title="Copy Error"
            content={item.error.message}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Entry"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => onRemove(item)}
        />
        <ActionPanel.Submenu
          title="Delete Recent Entries…"
          icon={Icon.Clock}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        >
          <Action title="Last 5 Minutes" icon={Icon.Clock} onAction={() => onClearByAge(5)} />
          <Action title="Last 15 Minutes" icon={Icon.Clock} onAction={() => onClearByAge(15)} />
          <Action title="Last 30 Minutes" icon={Icon.Clock} onAction={() => onClearByAge(30)} />
        </ActionPanel.Submenu>
        <Action
          title="Delete All Entries"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={onClearAll}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
