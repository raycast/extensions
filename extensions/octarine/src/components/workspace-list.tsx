import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import type { ReactNode } from "react";
import type { Workspace } from "@type/octarine";
import { WorkspaceListEmptyView } from "@components/empty-views/workspace";

type Props = {
  isLoading: boolean;
  workspaces: Workspace[];
  onRefresh: () => void | Promise<Workspace[]>;
  children: (workspace: Workspace) => ReactNode;
};

export function WorkspaceList({ isLoading, workspaces, onRefresh, children }: Props) {
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces">
      {workspaces.length === 0 && !isLoading ? (
        <WorkspaceListEmptyView>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </WorkspaceListEmptyView>
      ) : (
        workspaces.map((workspace) => (
          <List.Item
            key={workspace.path}
            title={workspace.name}
            subtitle={workspace.path}
            actions={
              <ActionPanel>
                {children(workspace)}
                <Action title="Copy Path" icon={Icon.Clipboard} onAction={() => Clipboard.copy(workspace.path)} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={onRefresh}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
