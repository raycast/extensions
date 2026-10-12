import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { dirname } from "node:path";
import type { ReactNode } from "react";
import { fileName, tildify } from "../lib/format";

interface Props {
  path: string;
  isFolder: boolean;
  /** Actions that go first, ahead of Open: Open at Line for a content match. */
  primary?: ReactNode;
  /** Command-specific actions, shown after the file actions. */
  children?: ReactNode;
  /** Scopes the search to a folder; omitted where the command can't scope. */
  onSearchIn?: (folder: string) => void;
  onToggleDetail?: () => void;
  isShowingDetail?: boolean;
}

export function FileActions({ path, isFolder, primary, children, onSearchIn, onToggleDetail, isShowingDetail }: Props) {
  const folder = isFolder ? path : dirname(path);
  return (
    <ActionPanel title={fileName(path)}>
      <ActionPanel.Section>
        {primary}
        <Action.Open title="Open" target={path} />
        <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd"], key: "return" }} />
        <Action.OpenWith path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
        {onToggleDetail && (
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        )}
      </ActionPanel.Section>
      {children}
      <ActionPanel.Section>
        {onSearchIn && (
          <Action
            title={isFolder ? "Search in This Folder" : "Search in Enclosing Folder"}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => onSearchIn(folder)}
          />
        )}
        <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        <Action.CopyToClipboard
          title="Copy Name"
          content={fileName(path)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard title="Copy File" content={{ file: path }} />
        <Action.CopyToClipboard title="Copy Folder Path" content={tildify(folder)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Trash paths={path} shortcut={Keyboard.Shortcut.Common.Remove} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
